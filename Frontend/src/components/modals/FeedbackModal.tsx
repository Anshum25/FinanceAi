import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: "success" | "error" | "info";
  primaryText?: string;
  onPrimary?: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onOpenChange, title, description, variant = "info", primaryText = "OK", onPrimary }) => {
  const headerClass =
    variant === "error"
      ? "bg-gradient-to-r from-destructive/20 to-red-500/10"
      : variant === "success"
      ? "bg-gradient-to-r from-green-500/20 to-emerald-500/10"
      : "bg-gradient-to-r from-primary/20 to-primary-glow/10";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className={`rounded-xl p-4 ${headerClass}`}>
            <DialogTitle className="text-lg">{title}</DialogTitle>
            {description && (
              <DialogDescription className="pt-1">{description}</DialogDescription>
            )}
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant={variant === "error" ? "destructive" : "gradient"} onClick={onPrimary}>
            {primaryText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
