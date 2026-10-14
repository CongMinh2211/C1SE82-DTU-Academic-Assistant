# Figma → web files

Design reference: `C1SE.82 DTU Academic Assistant Web UI UX` (Figma file `RfPM6KfUQFED0Um9XpaTmC`). The screens below are **route placeholders** in this structure branch, not finished UI.

| Figma screen | Route | Feature owner folder |
| --- | --- | --- |
| Student 01 Login | `/login` | `apps/web/src/features/auth` |
| Student 02 Home | `/student` | `apps/web/src/features/chat` |
| Student 03 Chat with Citations | `/student/chat` | `apps/web/src/features/chat` |
| Student 04 Safe Fallback | state within `/student/chat` | `apps/web/src/features/chat` |
| Student 05 FAQ and Procedures | `/student/faq` | `apps/web/src/features/faq` |
| Student 06 History | `/student/history` | `apps/web/src/features/history` |
| Student 07 Feedback and States | `/student/feedback` | `apps/web/src/features/feedback` |
| Student 08 Source Detail | `/student/sources/[id]` | `apps/web/src/features/documents` |
| Student 09 Feedback Sent | success state within `/student/feedback` | `apps/web/src/features/feedback` |
| Admin 01 Dashboard | `/admin` | `apps/web/src/features/admin` |
| Admin 02 Document Library | `/admin/documents` | `apps/web/src/features/documents` |
| Admin 03 Add Source | `/admin/documents/new` | `apps/web/src/features/documents` |
| Admin 04 Processing Status | `/admin/processing` | `apps/web/src/features/documents` |
| Admin 05 FAQ Management | `/admin/faqs` | `apps/web/src/features/faq` |
| Admin 06 Feedback Review | `/admin/feedback` | `apps/web/src/features/feedback` |
| Admin 07 History and Audit | `/admin/audit` | `apps/web/src/features/history` |
| Admin 08 FAQ Editor | `/admin/faqs/[id]` | `apps/web/src/features/faq` |

Foundation tokens in `apps/web/src/app/globals.css` follow the Figma red/navy/blue palette. Add exported DTU logo and campus image to `apps/web/public/images` only after verifying usage rights and image source. The login fields are deliberately disabled until authentication is implemented; preview links are not authentication.

Do not add course enrollment, grade editing or tuition payment screens: this system answers questions about those topics, but does not execute university transactions.
