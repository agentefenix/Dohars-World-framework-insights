-- Enable realtime for tasks table so TaskPanel updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;