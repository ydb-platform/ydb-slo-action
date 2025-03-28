import FormData from 'form-data';
import fetch from 'node-fetch';
export async function uploadToFileIO(buffer) {
    const form = new FormData();
    form.append('file', buffer, {
        filename: 'chart.png',
        contentType: 'image/png'
    });
    const response = await fetch('https://file.io', {
        method: 'POST',
        body: form
    });
    if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.statusText}`);
    }
    const data = await response.json();
    return data.link;
}
