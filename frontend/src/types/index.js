// 型定義
export interface ThreadState {
  thread_id: string;
  status: "pending" | "running" | "idle" | "interrupted" | "error";
  values: {
    procedure: string;
    sample_data_path?: string;
    df?: any[];
    output_excel_path?: string;
    result?: any[];
  };
  interrupts?: {
    [interrupt_id: string]: any;
  };
}

export interface ThreadSearchResult {
  thread_id: string;
  created_at: string;
  updated_at: string;
  status: ThreadState['status'];
  values: ThreadState['values'];
}

export interface FileUploadResponse {
  file_path: string;
  file_name: string;
  file_size: number;
}

