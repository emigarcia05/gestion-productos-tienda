"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type UploadStatus = "idle" | "dragging" | "uploading" | "success" | "error";

interface UploadedFile {
  name: string;
  size: number;
  status: UploadStatus;
  message?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function UploadZone() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;

    const valid = Array.from(incoming).filter((f) =>
      [".csv", ".xlsx", ".xls"].some((ext) => f.name.endsWith(ext))
    );

    if (valid.length === 0) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    const newFiles: UploadedFile[] = valid.map((f) => ({
      name: f.name,
      size: f.size,
      status: "uploading",
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    setStatus("uploading");

    // Simulación de carga — reemplazar con fetch real a /api/import
    setTimeout(() => {
      setFiles((prev) =>
        prev.map((f) =>
          newFiles.find((nf) => nf.name === f.name)
            ? { ...f, status: "success", message: "Importado correctamente" }
            : f
        )
      );
      setStatus("idle");
    }, 2000);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setStatus("idle");
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const isDragging = status === "dragging";

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-all duration-200 cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/50 hover:border-border bg-card/30"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setStatus("dragging");
        }}
        onDragLeave={() => setStatus("idle")}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div
            className={`mb-4 rounded-full p-4 transition-colors ${
              isDragging ? "bg-primary/10" : "bg-muted"
            }`}
          >
            <Upload
              className={`h-8 w-8 transition-colors ${
                isDragging ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>

          <p className="text-sm font-medium mb-1">
            {isDragging ? "Suelta el archivo aquí" : "Arrastra tu archivo o haz clic para seleccionar"}
          </p>
          <p className="text-xs text-muted-foreground">
            Formatos soportados: CSV, XLSX, XLS — Máx. 10 MB
          </p>

          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Seleccionar archivo
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.name} className="border-border/40 bg-card/50">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {file.status === "uploading" && (
                    <Badge variant="secondary" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Procesando
                    </Badge>
                  )}
                  {file.status === "success" && (
                    <Badge className="gap-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      Listo
                    </Badge>
                  )}
                  {file.status === "error" && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Error
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => removeFile(file.name)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
