import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

const notificationKeys = {
  all: ["notifications"],
  list: (params) => ["notifications", "list", params],
  unread: ["notifications", "unread-count"],
};

const useNotifications = ({ page = 1, limit = 20, unreadOnly = false, enabled = true } = {}) =>
  useQuery({
    queryKey: notificationKeys.list({ page, limit, unreadOnly }),
    queryFn: async () =>
      (
        await api.get("/notifications", {
          params: { page, limit, ...(unreadOnly ? { unreadOnly: true } : {}) },
        })
      ).data,
    enabled,
    staleTime: 15_000,
  });

const useUnreadNotificationCount = (enabled = true) =>
  useQuery({
    queryKey: notificationKeys.unread,
    queryFn: async () => (await api.get("/notifications/unread-count")).data.data.unread,
    enabled,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });

const useNotificationActions = () => {
  const queryClient = useQueryClient();

  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationKeys.all });

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.unread });
      const previous = queryClient.getQueryData(notificationKeys.unread);
      queryClient.setQueryData(notificationKeys.unread, (count = 0) => Math.max(0, count - 1));
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(notificationKeys.unread, context.previous);
      }
    },
    onSettled: refresh,
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.unread });
      const previous = queryClient.getQueryData(notificationKeys.unread);
      queryClient.setQueryData(notificationKeys.unread, 0);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(notificationKeys.unread, context.previous);
      }
    },
    onSettled: refresh,
  });

  return { markRead, markAllRead };
};

export { notificationKeys, useNotificationActions, useNotifications, useUnreadNotificationCount };
