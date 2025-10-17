import { Card } from "@/components/ui/card";
import { Users, CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface PipelineStatsProps {
  candidates: Array<{
    stage: string;
    status: string;
  }>;
}

const PipelineStats = ({ candidates }: PipelineStatsProps) => {
  const stats = {
    total: candidates.length,
    new: candidates.filter(c => c.stage === "new").length,
    screening: candidates.filter(c => c.stage === "screening").length,
    interview: candidates.filter(c => c.stage === "interview").length,
    offer: candidates.filter(c => c.stage === "offer").length
  };

  const statCards = [
    {
      title: "Total Candidates",
      value: stats.total,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "New Applications",
      value: stats.new,
      icon: Clock,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "In Interview",
      value: stats.interview,
      icon: TrendingUp,
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-500/10"
    },
    {
      title: "Offers Sent",
      value: stats.offer,
      icon: CheckCircle2,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <Icon className={`h-6 w-6 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} style={{ filter: 'none' }} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default PipelineStats;
