import { EmailSenderInterface } from '../ports/interfaces';

export class ConsoleEmailSender implements EmailSenderInterface {
    async sendVerificationEmail(email: string, token: string, path: string, type: string): Promise<void> {
        console.log('====================================');
        console.log(`[EmailSender] To: ${email}`);
        console.log(`[EmailSender] Type: ${type}`);
        console.log(`[EmailSender] Link: ${path}?token=${token}`);
        console.log('====================================');
    }
}