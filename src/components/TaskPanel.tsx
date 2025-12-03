import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp, ListTodo } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number | null;
  parent_task_id: string | null;
  created_at: string;
}

interface TaskPanelProps {
  agentId: string;
}

export function TaskPanel({ agentId }: TaskPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTasks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setTasks(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen, agentId]);

  // Subscribe to task changes
  useEffect(() => {
    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `agent_id=eq.${agentId}`,
        },
        () => {
          if (isOpen) {
            fetchTasks();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, isOpen]);

  const parentTasks = tasks.filter((t) => !t.parent_task_id);
  const getSubtasks = (parentId: string) => tasks.filter((t) => t.parent_task_id === parentId);

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "completed") return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    if (status === "in_progress") return <Loader2 className="w-3 h-3 text-primary animate-spin" />;
    return <Circle className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs bg-muted/30 border-b border-border/50 hover:bg-muted/50 transition-colors">
        <ListTodo className="w-3 h-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          Quest Board
          {tasks.length > 0 && (
            <span className="ml-2 text-[10px]">
              ({completedCount}✓ {inProgressCount}⟳ {pendingCount}○)
            </span>
          )}
        </span>
        {isOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="bg-muted/20 border-b border-border/50">
        <div className="p-3 max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No active quests. Ask the agent to decompose a goal into tasks.
            </p>
          ) : (
            <div className="space-y-2">
              {parentTasks.map((task) => {
                const subtasks = getSubtasks(task.id);
                const subtaskCompleted = subtasks.filter((s) => s.status === "completed").length;

                return (
                  <div key={task.id} className="text-xs">
                    <div className="flex items-start gap-2">
                      <StatusIcon status={task.status} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {task.title}
                        </p>
                        {subtasks.length > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            {subtaskCompleted}/{subtasks.length} subtasks complete
                          </p>
                        )}
                      </div>
                    </div>
                    {subtasks.length > 0 && (
                      <div className="ml-5 mt-1 space-y-1 border-l border-border/50 pl-2">
                        {subtasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-2">
                            <StatusIcon status={subtask.status} />
                            <span className={subtask.status === "completed" ? "line-through text-muted-foreground" : "text-foreground/80"}>
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
