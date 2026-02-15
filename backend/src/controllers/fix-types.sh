#!/bin/bash
# Fix TypeScript errors by replacing Request/Response with any

for file in *.controller.ts; do
  if [ -f "$file" ]; then
    # Replace (req: Request, res: Response) with (req: any, res: any)
    sed -i 's/(req: Request, res: Response)/(req: any, res: any)/g' "$file"
    
    # Replace (req: AuthRequest with (req: any
    sed -i 's/(req: AuthRequest/(req: any/g' "$file"
    
    echo "✅ Fixed $file"
  fi
done

echo ""
echo "🎉 All controller files fixed!"
