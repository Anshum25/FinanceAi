import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud } from "lucide-react";
import { useFinancial } from "@/contexts/FinancialContext";
import { useToast } from "@/components/ui/use-toast";

interface ImportDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImportDataModal: React.FC<ImportDataModalProps> = ({ open, onOpenChange }) => {
  const { setAwaitingImport } = useFinancial();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const onImport = async () => {
    setIsImporting(true);
    try {
      // TODO: parse Excel/CSV here and populate data by calling backend or updating context
      await new Promise((r) => setTimeout(r, 1200));
      setAwaitingImport(false);
      try { localStorage.setItem("dataImported", "true"); localStorage.removeItem("importDismissed"); } catch {}
      onOpenChange(false);
      toast({ title: "Import complete", description: "Your dashboard will refresh with insights." });
    } catch (e) {
      setAwaitingImport(true);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Import your financial data</DialogTitle>
          <DialogDescription>
            Upload an Excel (.xlsx), CSV, or PDF statement. We'll use this to initialize your dashboard. You can also skip and do it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-xl p-6 text-center bg-accent/10">
            <UploadCloud className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Drag and drop your file here, or choose a file</p>
            <div className="flex items-center justify-center gap-3">
              <Label htmlFor="file" className="sr-only">File</Label>
              <Input id="file" type="file" accept=".xlsx,.csv,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="max-w-xs" />
            </div>
            {file && <p className="text-xs text-muted-foreground mt-2">Selected: {file.name}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              try { localStorage.setItem("importDismissed", "true"); } catch {}
              onOpenChange(false);
              toast({ title: "Import later", description: "You can import data anytime from the dashboard." });
            }}
            disabled={isImporting}
          >
            Skip for now
          </Button>
          <Button variant="gradient" onClick={onImport} disabled={!file || isImporting}>
            {isImporting ? "Importing..." : "Import Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDataModal;
