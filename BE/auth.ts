// Mục đích file: Cấu hình xác thực tài khoản, phiên đăng nhập và các tùy chọn bảo mật của ứng dụng.
import { betterAuth } from "better-auth";
import { admin, emailOTP } from "better-auth/plugins";
import { authDatabase } from "./db";
import { appUrl, appOrigins, requiredEnv } from "./config";
import { profileSchema } from "@/lib/profile";
import { googleOAuthConfig } from "./google-config";
import { mailConfig, otpMessage, passwordResetMessage, sendMail } from "./mail";

function createAuth() {
  // Google chỉ bật khi đủ cấu hình; các bí mật được đọc từ môi trường máy chủ.
  const google = googleOAuthConfig();
  const otpEnabled = process.env.EMAIL_OTP_ENABLED === "true";
  // Không cho bật chính sách OTP nếu chưa có SMTP; tránh tạo tài khoản không thể xác minh.
  if (otpEnabled && !mailConfig())
    throw new Error("Cấu hình OTP yêu cầu SMTP đầy đủ.");
  return betterAuth({
    appName: "DTU Academic Assistant",
    baseURL: appUrl,
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    database: authDatabase(),
    trustedOrigins: appOrigins,
    socialProviders: google ? { google } : {},
    // Không tự liên kết tài khoản khác khi chưa có luồng liên kết rõ ràng.
    account: { accountLinking: { disableImplicitLinking: true } },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: otpEnabled,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      ...(mailConfig()
        ? {
            sendResetPassword: async ({
              user,
              url,
            }: {
              user: { email: string };
              url: string;
            }) => {
              // Liên kết chỉ gửi tới email yêu cầu; không ghi link hay thông tin xác thực vào log.
              await sendMail(passwordResetMessage(user.email, url));
            },
          }
        : {}),
    },
    user: {
      additionalFields: {
        studentCode: {
          type: "string",
          required: false,
          validator: { input: profileSchema.shape.studentCode },
        },
        cohort: {
          type: "string",
          required: false,
          validator: { input: profileSchema.shape.cohort },
        },
        major: {
          type: "string",
          required: false,
          validator: { input: profileSchema.shape.major },
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        // SSR đọc phiên cho mỗi trang; không dùng chung hạn mức với thao tác đăng nhập.
        "/get-session": false,
        "/sign-in/email": { window: 60, max: 8 },
        "/sign-up/email": { window: 3600, max: 8 },
        "/request-password-reset": { window: 3600, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: appUrl.startsWith("https://"),
      ipAddress: {
        ipAddressHeaders: process.env.VERCEL
          ? ["x-vercel-forwarded-for"]
          : ["x-dtu-client-ip"],
      },
    },
    // OTP băm trong CSDL, hết hạn sau 5 phút, có giới hạn thử và gửi lại.
    // Chặn xóa trực tiếp qua Better Auth; API ứng dụng kiểm tra dữ liệu và ghi nhật ký.
    disabledPaths: [
      "/admin/remove-user",
      ...(otpEnabled ? ["/sign-in/email-otp"] : []),
    ],
    plugins: [
      admin({ defaultRole: "user", adminRoles: ["admin"] }),
      ...(otpEnabled
        ? [
            emailOTP({
              otpLength: 6,
              expiresIn: 300,
              allowedAttempts: 3,
              storeOTP: "hashed",
              resendStrategy: "rotate",
              rateLimit: { window: 60, max: 3 },
              overrideDefaultEmailVerification: true,
              sendVerificationOTP: async ({ email, otp, type }) => {
                if (type !== "email-verification" && type !== "forget-password")
                  throw new Error("Loại mã không được hỗ trợ.");
                await sendMail(otpMessage(email, otp, type));
              },
            }),
          ]
        : []),
    ],
    logger: { disabled: true },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
