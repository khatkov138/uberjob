import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getServerSession } from "@/lib/get-session";
 
const f = createUploadthing();
 
export const ourFileRouter = {
  // Эндпоинт для загрузки аватара
  avatarUploader: f({ 
    image: { 
      maxFileSize: "2MB", 
      maxFileCount: 1 
    } 
  })
    .middleware(async () => {
      const session = await getServerSession();
      // Если нет сессии, выкидываем ошибку (безопасность)
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Этот код выполнится на сервере после успешной загрузки
      console.log("Upload complete for userId:", metadata.userId);
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;