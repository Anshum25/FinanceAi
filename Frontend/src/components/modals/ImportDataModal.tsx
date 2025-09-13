import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UploadCloud, FileText, Trash2 } from "lucide-react";
import { useFinancial } from "@/contexts/FinancialContext";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

interface ImportDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DocumentType = 'assetStatement' | 'epfPassbook' | 'mutualFundCAS' | 'creditReport';

interface DocumentFiles {
  [key: string]: File[];
}

const ImportDataModal: React.FC<ImportDataModalProps> = ({ open, onOpenChange }) => {
  const { setAwaitingImport } = useFinancial();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  
  // All document types are always enabled (no toggles)
  const enabledDocuments = {
    assetStatement: true,
    epfPassbook: true,
    mutualFundCAS: true,
    creditReport: true,
  };
  
  // Files for each document type
  const [documentFiles, setDocumentFiles] = useState<DocumentFiles>({
    assetStatement: [],
    epfPassbook: [],
    mutualFundCAS: [],
    creditReport: [],
  });

  const documentTypes = [
    { key: 'assetStatement', label: 'Asset Statement', description: 'Bank statements, investment accounts' },
    { key: 'epfPassbook', label: 'EPF Passbook', description: 'Employee Provident Fund statements' },
    { key: 'mutualFundCAS', label: 'Mutual Fund CAS', description: 'Consolidated Account Statement' },
    { key: 'creditReport', label: 'Credit Report', description: 'CIBIL or credit bureau reports' },
  ];

  // Remove toggleDocument function as we no longer have toggles

  const addFiles = (docType: DocumentType, files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    if (newFiles.length !== files.length) {
      toast({ title: "Invalid files", description: "Only PDF files are allowed.", variant: "destructive" });
    }
    
    setDocumentFiles(prev => ({
      ...prev,
      [docType]: [...prev[docType], ...newFiles]
    }));
  };

  const removeFile = (docType: DocumentType, index: number) => {
    setDocumentFiles(prev => ({
      ...prev,
      [docType]: prev[docType].filter((_, i) => i !== index)
    }));
  };

  const hasAnyFiles = () => {
    return Object.values(documentFiles).some(files => files.length > 0);
  };

  const onImport = async () => {
    setIsImporting(true);
    try {
      // Upload documents for each enabled type
      const uploadPromises = [];
      
      for (const [docType, files] of Object.entries(documentFiles)) {
        if (files.length > 0 && enabledDocuments[docType as DocumentType]) {
          uploadPromises.push(api.uploadDocuments(docType, files));
        }
      }
      
      if (uploadPromises.length === 0) {
        throw new Error("No files to upload");
      }
      
      await Promise.all(uploadPromises);
      
      setAwaitingImport(false);
      try { localStorage.setItem("dataImported", "true"); localStorage.removeItem("importDismissed"); } catch {}
      onOpenChange(false);
      toast({ title: "Import complete", description: "Your documents have been uploaded and are being processed." });
    } catch (e: any) {
      setAwaitingImport(true);
      toast({ 
        title: "Import failed", 
        description: e.message || "Please try again.", 
        variant: "destructive" 
      });
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
            Upload your financial documents as PDF files. You can upload multiple files per document type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-96 overflow-y-auto">
          {documentTypes.map((docType) => (
            <div key={docType.key} className="space-y-3">
              {/* Document type header - no toggle */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">{docType.label}</Label>
                <p className="text-xs text-muted-foreground">{docType.description}</p>
              </div>

              {/* Upload area - always visible */}
              <div className="space-y-2">
                <div className="border-2 border-dashed rounded-lg p-4 bg-accent/5">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <UploadCloud className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Upload PDF files</span>
                  </div>
                  <Input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => addFiles(docType.key as DocumentType, e.target.files)}
                    className="text-xs"
                  />
                </div>

                {/* Show uploaded files */}
                {documentFiles[docType.key]?.length > 0 && (
                  <div className="space-y-1">
                    {documentFiles[docType.key].map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-accent/10 rounded p-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-primary" />
                          <span className="text-xs truncate max-w-[200px]">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(docType.key as DocumentType, index)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
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
          <Button variant="gradient" onClick={onImport} disabled={!hasAnyFiles() || isImporting}>
            {isImporting ? "Processing..." : "Import Documents"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDataModal;
