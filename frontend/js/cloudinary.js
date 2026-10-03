/**
 * GG BANK - Cloudinary Document & Media Cloud Engine
 * Uploads KYC documents, signatures, passport photos, and loan attachments.
 */

const Cloudinary = {
  cloudName: 'mvqwnanf',
  uploadPreset: 'ggbank_uploads',

  async upload(fileOrBase64, folder = 'ggbank_documents') {
    if (!fileOrBase64) return null;

    try {
      const formData = new FormData();
      formData.append('file', fileOrBase64);
      formData.append('upload_preset', this.uploadPreset);
      if (folder) formData.append('folder', folder);

      const endpoint = `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`;
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        console.log('☁️ Document uploaded to Cloudinary:', data.secure_url);
        return data.secure_url;
      } else {
        console.warn('Cloudinary upload warning:', await res.text());
        return typeof fileOrBase64 === 'string' ? fileOrBase64 : await this.toBase64(fileOrBase64);
      }
    } catch (err) {
      console.warn('Cloudinary network notice (retaining secure local copy):', err.message);
      return typeof fileOrBase64 === 'string' ? fileOrBase64 : await this.toBase64(fileOrBase64);
    }
  },

  toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }
};

window.Cloudinary = Cloudinary;
