export const generateWelcomeEmailBody = (username: string) =>
    `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f4f7fa;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <tr>
                <td style="background-color: #4a90e2; text-align: center;">
                    <p style="font-size: 54px; line-height: 54px; font-weight: 600; color: #ffffff; margin: 0; padding: 24px 0;">SubTracka</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px;">                
                    <p style="font-size: 16px; margin-bottom: 25px;">Hello <strong style="color: #4a90e2;">${username}</strong>,</p>

                    <p style="font-size: 16px; margin-bottom: 25px;">You're welcome! I hope you enjoy using SubTracka 😃</p>

                    <p style="font-size: 16px; margin-top: 30px;">
                        Best regards,<br>
                        <strong>The SubTracka Team</strong>
                    </p>
                </td>
            </tr>
            <tr>
                <td style="background-color: #f0f7ff; padding: 20px; text-align: center; font-size: 14px;">
                    <p style="margin: 0 0 10px;">
                        SubTracka Inc. | 123 Main St, Anytown, AN 12345
                    </p>
                    <p style="margin: 0;">
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Unsubscribe</a> | 
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Privacy Policy</a> | 
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Terms of Service</a>
                    </p>
                </td>
            </tr>
        </table>
    </div>`;

export const generatePasswordResetEmailBody = ({ resetURL, expiry }: { resetURL: string; expiry: string }) =>
    `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f4f7fa;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <tr>
                <td style="background-color: #4a90e2; text-align: center;">
                    <p style="font-size: 54px; line-height: 54px; font-weight: 600; color: #ffffff; margin: 0; padding: 24px 0;">SubTracka</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px;">                
                    <p style="font-size: 16px; margin-bottom: 25px;">Hello there,</p>

                    <p style="font-size: 16px; margin-bottom: 25px;">Here's your password reset link. It expires in <strong style="color: #4a90e2;">${expiry}</strong> time from now.</p>

                    <div style="background-color: #f0f7ff; border-radius: 10px; padding: 20px; margin-bottom: 25px; text-align: center;">
                        <a href="${resetURL}" style="color: #4a90e2; text-decoration: none; font-size: 16px; font-weight: bold;">Reset Your Password</a>
                    </div>

                    <p style="font-size: 16px; margin-bottom: 25px;">Given the absence of HTML views in the current version of SubTracker, you are required to make a cURL request to the reset link.</p>
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">Copy and paste in a terminal, replacing "your_new_password" with your own password, as illustrated below:</p>

                    <div style="background-color: #f0f7ff; border-radius: 10px; padding: 20px; margin-bottom: 25px; font-family: monospace; font-size: 14px; overflow-x: auto;">
                        curl -X POST "${resetURL}" -H "Content-Type: application/json" -d '{"new_password": "your_new_password"}'
                    </div>

                    <p style="font-size: 16px; margin-top: 30px;">
                        Best regards,<br>
                        <strong>The SubTracka Team</strong>
                    </p>
                </td>
            </tr>
            <tr>
                <td style="background-color: #f0f7ff; padding: 20px; text-align: center; font-size: 14px;">
                    <p style="margin: 0 0 10px;">
                        SubTracka Inc. | 123 Main St, Anytown, AN 12345
                    </p>
                    <p style="margin: 0;">
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Unsubscribe</a> | 
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Privacy Policy</a> | 
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Terms of Service</a>
                    </p>
                </td>
            </tr>
        </table>
    </div>`;

export const generateSubCreationEmailBody = (username: string, subName: string) =>
    `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f4f7fa;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <tr>
                <td style="background-color: #4a90e2; text-align: center;">
                    <p style="font-size: 54px; line-height: 54px; font-weight: 600; color: #ffffff; margin: 0; padding: 24px 0;">SubTracka</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px;">                
                    <p style="font-size: 16px; margin-bottom: 25px;">Hello <strong style="color: #4a90e2;">${username}</strong>,</p>

                    <p style="font-size: 16px; margin-bottom: 25px;">This is to confirm that you have successfully created a ${
                        subName.toLowerCase().endsWith("subscription") ? subName : `${subName} subscription`
                    }. Watch out for upcoming renewal emails from us!</p>

                    <p style="font-size: 16px; margin-bottom: 25px;">Have a lovely day! 👋</p>

                    <p style="font-size: 16px; margin-top: 30px;">
                        Best regards,<br>
                        <strong>The SubTracka Team</strong>
                    </p>
                </td>
            </tr>
            <tr>
                <td style="background-color: #f0f7ff; padding: 20px; text-align: center; font-size: 14px;">
                    <p style="margin: 0 0 10px;">
                        SubTracka Inc. | 123 Main St, Anytown, AN 12345
                    </p>
                    <p style="margin: 0;">
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Unsubscribe</a> | 
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Privacy Policy</a> | 
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Terms of Service</a>
                    </p>
                </td>
            </tr>
        </table>
    </div>`;

export const generateSubCancellationEmailBody = (username: string) =>
    `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f4f7fa;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <tr>
                <td style="background-color: #4a90e2; text-align: center;">
                    <p style="font-size: 54px; line-height: 54px; font-weight: 600; color: #ffffff; margin: 0; padding: 24px 0;">SubTracka</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px;">                
                    <p style="font-size: 16px; margin-bottom: 25px;">Hello <strong style="color: #4a90e2;">${username}</strong>,</p>

                    <p style="font-size: 16px; margin-bottom: 25px;">We're deeply sad realizing you no longer want to renew your subscription with us.</p>

                    <p style="font-size: 16px; margin-bottom: 25px;">Have a lovely day! 👋</p>

                    <p style="font-size: 16px; margin-top: 30px;">
                        Best regards,<br>
                        <strong>The SubTracka Team</strong>
                    </p>
                </td>
            </tr>
            <tr>
                <td style="background-color: #f0f7ff; padding: 20px; text-align: center; font-size: 14px;">
                    <p style="margin: 0 0 10px;">
                        SubTracka Inc. | 123 Main St, Anytown, AN 12345
                    </p>
                    <p style="margin: 0;">
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Unsubscribe</a> | 
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Privacy Policy</a> | 
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Terms of Service</a>
                    </p>
                </td>
            </tr>
        </table>
    </div>`;

export interface EmailData {
    username: string;
    subName: string;
    renewalDate: string;
    planName: string;
    price: string;
    paymentMethod: string;
    accountSettingsLink?: string;
    supportLink?: string;
    daysLeft?: Number;
}

// prettier-ignore
export const generateReminderEmail = ({ username, subName, renewalDate, planName, price, paymentMethod, accountSettingsLink, supportLink, daysLeft }: EmailData) => 
    `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f4f7fa;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <tr>
                <td style="background-color: #4a90e2; text-align: center;">
                    <p style="font-size: 54px; line-height: 54px; font-weight: 600; color: #ffffff; margin: 0; padding: 24px 0;">SubTracka</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 30px;">                
                    <p style="font-size: 16px; margin-bottom: 25px;">Hello <strong style="color: #4a90e2;">${username}</strong>,</p>

                    <p style="font-size: 16px; margin-bottom: 25px;">Your <strong>${subName}</strong> subscription is set to renew on <strong style="color: #4a90e2;">${renewalDate}</strong> (${daysLeft} days from today).</p>

                    <table cellpadding="15" cellspacing="0" border="0" width="100%" style="background-color: #f0f7ff; border-radius: 10px; margin-bottom: 25px;">
                        <tr>
                            <td style="font-size: 16px; border-bottom: 1px solid #d0e3ff;">
                                <strong>Plan:</strong> ${planName}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 16px; border-bottom: 1px solid #d0e3ff;">
                                <strong>Price:</strong> ${price}
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size: 16px;">
                                <strong>Payment Method:</strong> ${paymentMethod}
                            </td>
                        </tr>
                    </table>

                    <p style="font-size: 16px; margin-bottom: 25px;">If you'd like to make changes or cancel your subscription, please visit your <a href="${accountSettingsLink}" style="color: #4a90e2; text-decoration: none;">account settings</a> before the renewal date.</p>

                    <p style="font-size: 16px; margin-top: 30px;">Need help? <a href="${supportLink}" style="color: #4a90e2; text-decoration: none;">Contact our support team</a> anytime.</p>

                    <p style="font-size: 16px; margin-top: 30px;">
                        Best regards,<br>
                        <strong>The SubTracka Team</strong>
                    </p>
                </td>
            </tr>
            <tr>
                <td style="background-color: #f0f7ff; padding: 20px; text-align: center; font-size: 14px;">
                    <p style="margin: 0 0 10px;">
                        SubTracka Inc. | 123 Main St, Anytown, AN 12345
                    </p>
                    <p style="margin: 0;">
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Unsubscribe</a> | 
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Privacy Policy</a> | 
                        <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Terms of Service</a>
                    </p>
                </td>
            </tr>
        </table>
    </div>`
;
