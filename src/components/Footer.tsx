import { Link } from "react-router-dom";
import { Twitter, MessageCircle, Mail, Shield, FileText } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="gradient-primary rounded-lg p-1.5">
                <span className="font-display text-sm font-bold text-primary-foreground">BN</span>
              </div>
              <span className="font-display text-lg font-bold tracking-wider text-foreground">
                BET<span className="text-primary">NEXA</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              The premier destination for sports betting. Fast payouts, best odds, live action.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-foreground">Sports</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary">Football</Link></li>
              <li><Link to="/" className="hover:text-primary">Basketball</Link></li>
              <li><Link to="/" className="hover:text-primary">Tennis</Link></li>
              <li><Link to="/" className="hover:text-primary">Cricket</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-foreground">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary">Help Center</Link></li>
              <li><Link to="/" className="hover:text-primary">Responsible Gambling</Link></li>
              <li><Link to="/" className="hover:text-primary">Terms & Conditions</Link></li>
              <li><Link to="/" className="hover:text-primary">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-foreground">Connect</h4>
            <div className="flex gap-3">
              <a href="#" className="rounded-lg bg-secondary p-2 text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="rounded-lg bg-secondary p-2 text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-4 w-4" />
              </a>
              <a href="#" className="rounded-lg bg-secondary p-2 text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3 text-primary" />
              Licensed & Regulated
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © 2026 BetNexa. All rights reserved. 18+ | Gamble Responsibly.
        </div>
      </div>
    </footer>
  );
}
