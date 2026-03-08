"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  // #region agent log
  fetch('http://127.0.0.1:7682/ingest/b70e1de7-b1ca-437c-8f3d-79f7aafa5e30',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'38128a'},body:JSON.stringify({sessionId:'38128a',location:'actions.ts:loginAction',message:'loginAction called',data:{hasUsername:!!username,hasPassword:!!password,usernameLength:username?.length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid username or password" };
        default:
          return { error: "Something went wrong" };
      }
    }
    throw error;
  }
}
