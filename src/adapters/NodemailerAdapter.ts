import { EmailSenderInterface } from '../ports/interfaces';
import nodemailer, { Transporter } from 'nodemailer';

export interface NodemailerConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    fromName: string;
    baseUrl: string;
}

export class NodemailerAdapter implements EmailSenderInterface {
    private readonly transporter: Transporter;
    private readonly config: NodemailerConfig;

    constructor(config?: Partial<NodemailerConfig>) {
        this.config = {
            host: config?.host || process.env.SMTP_HOST || '',
            port: config?.port || parseInt(process.env.SMTP_PORT || '587'),
            user: config?.user || process.env.SMTP_USER || '',
            pass: config?.pass || process.env.SMTP_PASS || '',
            fromName: config?.fromName || process.env.APP_NAME || 'AuthLibG',
            baseUrl: config?.baseUrl || process.env.API_URL || '',
        };

        if (!this.config.host || !this.config.user || !this.config.pass) {
            // We don't throw here to allow instantiation, but send will fail if not provided later
        }

        this.transporter = nodemailer.createTransport({
            host: this.config.host,
            port: this.config.port,
            secure: this.config.port === 465,
            auth: {
                user: this.config.user,
                pass: this.config.pass,
            },
        });
    }

    async sendVerificationEmail(email: string, token: string, path: string, type: string): Promise<void> {
        if (!this.config.host || !this.config.baseUrl) {
            throw new Error('NodemailerAdapter: SMTP or API_URL configuration missing.');
        }

        const url = new URL(path.replace(/^\//, ''), this.config.baseUrl);
        url.searchParams.set('token', token);
        url.searchParams.set('type', type);

        await this.transporter.sendMail({
            from: `"${this.config.fromName}" <${this.config.user}>`,
            to: email,
            subject: 'Verify your email',
            html: `
                <h3>Email verification</h3>
                <p>Click the link below to verify your account:</p>
                <a href="${url.toString()}">${url.toString()}</a>
            `,
        });
    }
}
