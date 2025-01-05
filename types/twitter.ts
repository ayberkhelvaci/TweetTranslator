export interface TwitterApiError {
  code: number;
  message: string;
  errors?: Array<{
    message: string;
    code?: number;
    title?: string;
    detail?: string;
  }>;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
} 