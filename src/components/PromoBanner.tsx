import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PromoBanner() {
  const navigate = useNavigate();

  const handleClaimBonus = () => {
    navigate("/finance");
  };

  return (
    <section className="container mx-auto px-4 py-6">
      <div className="relative overflow-hidden rounded-xl gradient-primary p-6 md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/5" />
        <div className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-primary-foreground/5" />
        <div className="relative z-10 flex flex-col items-center justify-between gap-4 md:flex-row">
          <div>
            <h3 className="font-display text-lg font-bold uppercase tracking-wider text-primary-foreground md:text-xl">
              🎁 Welcome Bonus — 100% up to $500
            </h3>
            <p className="mt-1 text-sm text-primary-foreground/80">
              Sign up today and double your first deposit. T&C apply.
            </p>
          </div>
          <Button variant="gold" size="lg" className="shrink-0" onClick={handleClaimBonus}>
            <Zap className="mr-1 h-4 w-4" /> Claim Now
          </Button>
        </div>
      </div>
    </section>
  );
}
