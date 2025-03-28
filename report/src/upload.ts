import { promisify } from 'node:util';
import { exec } from 'node:child_process';

const execAsync = promisify(exec);

export async function uploadToFileIO(filePath: string): Promise<string> {
    const { stdout, stderr } = await execAsync(`curl -s -F 'file=@${filePath}' https://0x0.st`);
    
    if (stderr) {
        throw new Error(`Failed to upload file: ${stderr}`);
    }

    return stdout.trim();
} 