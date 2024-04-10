import type { DataProps } from "hwy";

export async function action({ request }: DataProps) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return {
      error: true,
      message: "Error: Please enter a valid email and password.",
    };
  }

  if (!email.includes(".") || !email.includes("@")) {
    return {
      error: true,
      message: "Error: Please enter a valid email address.",
    };
  }

  if (password.length < 4) {
    return {
      error: true,
      message: "Error: Please enter a password that is at least 4 characters.",
    };
  }

  return {
    email: "",
    success: true,
    message: `Congrats! You are signed in as ${email}.`,
  };
}

export type ActionType = typeof action;
