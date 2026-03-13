/**
 * Base HTML email layout — responsive, clean design with ForkCart branding.
 * All email templates wrap their content with this layout.
 */

export function baseLayout(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>ForkCart</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; width: 100%; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .email-wrapper { width: 100%; background-color: #f4f4f7; padding: 24px 0; }
    .email-content { max-width: 600px; margin: 0 auto; }
    .email-header { text-align: center; padding: 24px 0; }
    .email-header img { max-height: 40px; }
    .email-header .logo-text { font-size: 24px; font-weight: 700; color: #1a1a2e; text-decoration: none; }
    .email-body { background-color: #ffffff; border-radius: 8px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .email-body h1 { font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0 0 16px; }
    .email-body p { font-size: 15px; line-height: 1.6; color: #4a4a68; margin: 0 0 16px; }
    .email-body .btn { display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 8px 0; }
    .email-body .btn:hover { background-color: #4338ca; }
    .email-footer { text-align: center; padding: 24px 0; }
    .email-footer p { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; }
    .order-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .order-table th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .order-table td { padding: 12px 8px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
    .order-table .total-row td { border-top: 2px solid #e5e7eb; font-weight: 700; font-size: 16px; color: #1a1a2e; }
    .address-block { background-color: #f9fafb; border-radius: 6px; padding: 16px; margin: 12px 0; }
    .address-block p { margin: 0; font-size: 14px; line-height: 1.5; color: #374151; }
    .divider { border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    @media only screen and (max-width: 600px) {
      .email-body { padding: 24px 16px; }
      .email-body h1 { font-size: 20px; }
    }
  </style>
</head>
<body>
  <!-- Preview text (hidden) -->
  <div style="display:none;font-size:1px;color:#f4f4f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${previewText}
  </div>

  <table class="email-wrapper" role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table class="email-content" role="presentation" cellpadding="0" cellspacing="0" width="600">
          <!-- Header -->
          <tr>
            <td class="email-header">
              <!-- Replace src with your logo URL -->
              <a href="#" class="logo-text">🛒 ForkCart</a>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="email-body">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <p>Powered by ForkCart — AI-native E-Commerce</p>
              <p>&copy; ${new Date().getFullYear()} ForkCart. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
