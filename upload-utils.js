/**
 * File Upload Utilities
 * Helper functions for uploading files to the Sirius backend
 */

window.SiriusUpload = {
  /**
   * Upload a profile photo
   * @param {File} file - The file to upload
   * @param {string} token - Auth token
   * @returns {Promise<{url: string, path: string}>}
   */
  async uploadProfilePhoto(file, token) {
    const formData = new FormData();
    formData.append('profilePhoto', file);

    const response = await fetch('/api/v2/upload/profile-photo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Failed to upload profile photo');
    }

    const data = await response.json();
    return {
      url: data.data.url,
      path: data.data.path
    };
  },

  /**
   * Upload multiple business images
   * @param {FileList|File[]} files - The files to upload
   * @param {string} token - Auth token
   * @returns {Promise<{urls: string[], paths: string[], count: number}>}
   */
  async uploadBusinessImages(files, token) {
    const formData = new FormData();

    // Handle both FileList and Array
    const filesArray = Array.from(files);
    filesArray.forEach(file => {
      formData.append('businessImages', file);
    });

    const response = await fetch('/api/v2/upload/business-images', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Failed to upload business images');
    }

    const data = await response.json();
    return {
      urls: data.data.files.map(f => f.url),
      paths: data.data.files.map(f => f.path),
      count: data.data.count
    };
  },

  /**
   * Upload a license document
   * @param {File} file - The file to upload
   * @param {string} token - Auth token
   * @returns {Promise<{url: string, path: string}>}
   */
  async uploadLicenseDocument(file, token) {
    const formData = new FormData();
    formData.append('licenseDocument', file);

    const response = await fetch('/api/v2/upload/license-document', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Failed to upload license document');
    }

    const data = await response.json();
    return {
      url: data.data.url,
      path: data.data.path
    };
  },

  /**
   * Upload job attachments
   * @param {FileList|File[]} files - The files to upload
   * @param {string} token - Auth token
   * @returns {Promise<{urls: string[], paths: string[], count: number}>}
   */
  async uploadJobAttachments(files, token) {
    const formData = new FormData();

    // Handle both FileList and Array
    const filesArray = Array.from(files);
    filesArray.forEach(file => {
      formData.append('attachments', file);
    });

    const response = await fetch('/api/v2/upload/job-attachments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Failed to upload job attachments');
    }

    const data = await response.json();
    return {
      urls: data.data.files.map(f => f.url),
      paths: data.data.files.map(f => f.path),
      count: data.data.count
    };
  },

  /**
   * Validate file before upload
   * @param {File} file - The file to validate
   * @param {Object} options - Validation options
   * @param {string[]} options.allowedTypes - Allowed MIME types
   * @param {number} options.maxSize - Max size in bytes
   * @returns {{valid: boolean, error: string|null}}
   */
  validateFile(file, options = {}) {
    const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`
      };
    }

    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File is too large. Maximum size: ${maxSizeMB}MB`
      };
    }

    return { valid: true, error: null };
  }
};
