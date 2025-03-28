import { promisify } from 'node:util';
import { exec } from 'node:child_process';
const execAsync = promisify(exec);
export async function uploadToFileIO(filePath) {
    const { stdout, stderr } = await execAsync(`curl -s --upload-file ${filePath} https://transfer.sh/chart.png`);
    if (stderr) {
        throw new Error(`Failed to upload file: ${stderr}`);
    }
    return stdout.trim();
}
