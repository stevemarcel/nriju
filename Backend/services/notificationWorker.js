import EmailOutbox from "../models/EmailOutbox.js";
import { sendEmail } from "./emailService.js";
import { processDueReviewReminders } from "./reviewReminderService.js";

const EMAIL_INTERVAL_MS = 30 * 1000;
const REVIEW_INTERVAL_MS = 5 * 60 * 1000;
const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_EMAILS_PER_RUN = 20;

let workersStarted = false;

const claimNextEmail = async (now = new Date()) => {
  const staleClaim = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  return EmailOutbox.findOneAndUpdate(
    {
      nextAttemptAt: { $lte: now },
      $or: [
        { status: { $in: ["pending", "failed"] } },
        { status: "processing", claimedAt: { $lte: staleClaim } },
      ],
    },
    {
      $set: { status: "processing", claimedAt: now },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { nextAttemptAt: 1 } },
  );
};

const processPendingEmails = async ({ limit = MAX_EMAILS_PER_RUN } = {}) => {
  let processed = 0;

  while (processed < limit) {
    const email = await claimNextEmail();
    if (!email) break;

    let sendError = null;
    try {
      await sendEmail({
        to: email.to,
        toName: email.toName,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    } catch (error) {
      sendError = error;
    }
    const now = new Date();

    if (!sendError) {
      email.status = "sent";
      email.sentAt = now;
      email.claimedAt = null;
      email.lastError = "";
    } else {
      const retryMinutes = Math.min(60, 2 ** Math.min(email.attempts, 6));
      email.status = "failed";
      email.claimedAt = null;
      email.lastError = String(
        sendError?.message || "Email provider rejected the delivery attempt.",
      ).slice(0, 1000);
      email.nextAttemptAt = new Date(now.getTime() + retryMinutes * 60 * 1000);
    }

    await email.save();
    processed += 1;
  }

  return processed;
};

const runWorker = (label, task) => {
  task().catch((error) => console.error(`${label} failed:`, error.message));
};

const startNotificationWorkers = () => {
  if (workersStarted) return;
  workersStarted = true;

  runWorker("Notification email worker", processPendingEmails);
  runWorker("Review reminder worker", processDueReviewReminders);

  const emailTimer = setInterval(
    () => runWorker("Notification email worker", processPendingEmails),
    EMAIL_INTERVAL_MS,
  );
  const reminderTimer = setInterval(
    () => runWorker("Review reminder worker", processDueReviewReminders),
    REVIEW_INTERVAL_MS,
  );

  emailTimer.unref();
  reminderTimer.unref();
};

export { processPendingEmails, startNotificationWorkers };
