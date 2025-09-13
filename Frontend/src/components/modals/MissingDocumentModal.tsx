import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, FileText, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

interface MissingDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissionType: string;
  onDocumentUploaded?: () => void;
}

const MissingDocumentModal: React.FC<MissingDocumentModalProps> = ({ 
  open, 
  onOpenChange, 
  permissionType,
  onDocumentUploaded 
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // Map permission types to document types and descriptions
  const getDocumentInfo = (permission: string) => {
    switch (permission) {
      case 'assets':
      case 'transactions':
        return {
          documentType: 'assetStatement',
          title: 'Asset Statement Required',
          description: 'To enable asset and transaction insights, please upload your bank statements or investment account documents.',
          label: 'Asset Statement',
          hint: 'Bank statements, investment accounts'
        };
      case 'epf':
        return {
          documentType: 'epfPassbook',
          title: 'EPF Passbook Required',
          description: 'To enable EPF balance insights, please upload your EPF passbook or statements.',
          label: 'EPF Passbook',
          hint: 'Employee Provident Fund statements'
        };
      case 'investments':
        return {
          documentType: 'mutualFundCAS',
          title: 'Mutual Fund CAS Required',
          description: 'To enable investment insights, please upload your Consolidated Account Statement (CAS).',
          label: 'Mutual Fund CAS',
          hint: 'Consolidated Account Statement'
        };
      case 'creditScore':
        return {
          documentType: 'creditReport',
          title: 'Credit Report Required',
          description: 'To enable credit score insights, please upload your credit report from CIBIL or other credit bureaus.',
          label: 'Credit Report',
          hint: 'CIBIL or credit bureau reports'
        };
      default:
        return {
          documentType: 'assetStatement',
          title: 'Document Required',
          description: 'Please upload the required document to enable this feature.',
          label: 'Document',
          hint: 'PDF files only'
        };
    }
  };

  const documentInfo = getDocumentInfo(permissionType);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    
    const newFiles = Array.from(fileList).filter(file => file.type === 'application/pdf');
    if (newFiles.length !== fileList.length) {
      toast({ title: "Invalid files", description: "Only PDF files are allowed.", variant: "destructive" });
    }
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({ title: "No files selected", description: "Please select at least one PDF file.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const res: any = await api.uploadDocuments(documentInfo.documentType, files);

      const docs: any[] = res?.data?.documents || [];
      if (!docs.length) {
        toast({ title: "Uploaded", description: "No documents returned from server.", variant: "default" });
      } else {
        // Kick off processing for each uploaded document sequentially to surface errors clearly
        for (const d of docs) {
          try {
            await api.processDocument(d._id);
          } catch (procErr: any) {
            toast({ title: "Process failed", description: procErr?.message || "Unable to process a document.", variant: "destructive" });
            // continue processing others
          }
        }

        toast({ 
          title: "Upload successful", 
          description: "Documents uploaded and processed. Refreshing data..." 
        });
      }

      onDocumentUploaded?.();
      onOpenChange(false);
      setFiles([]);
    } catch (e: any) {
      toast({ 
        title: "Upload failed", 
        description: e.message || "Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <DialogTitle className="text-amber-600">{documentInfo.title}</DialogTitle>
          </div>
          <DialogDescription>
            {documentInfo.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium">{documentInfo.label}</Label>
            <p className="text-xs text-muted-foreground">{documentInfo.hint}</p>
          </div>

          <div className="border-2 border-dashed rounded-lg p-4 bg-accent/5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <UploadCloud className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Upload PDF files</span>
            </div>
            <Input
              type="file"
              accept=".pdf"
              multiple
              onChange={(e) => addFiles(e.target.files)}
              className="text-xs"
            />
          </div>

          {/* Show uploaded files */}
          {files.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Selected files:</Label>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-accent/10 rounded p-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-primary" />
                    <span className="text-xs truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            variant="gradient" 
            onClick={handleUpload} 
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload Documents"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MissingDocumentModal;
