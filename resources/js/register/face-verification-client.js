window.FaceVerificationClient = class FaceVerificationClient {
    constructor(apiBaseUrl) {
      this.apiBaseUrl = apiBaseUrl || '/api/face-verification';
      this.sessionId = null;
      this.currentChallenge = null;
      this.stream = null;
      this.video = null;
      this.canvas = null;
      this.verificationToken = null;
      this.onStatusUpdate = null;
      this.onChallengeChange = null;
      this.onComplete = null;
      this.onError = null;
    }
  
    // Set callback functions
    setCallbacks(callbacks) {
      this.onStatusUpdate = callbacks.onStatusUpdate || this.onStatusUpdate;
      this.onChallengeChange = callbacks.onChallengeChange || this.onChallengeChange;
      this.onComplete = callbacks.onComplete || this.onComplete;
      this.onError = callbacks.onError || this.onError;
    }
  
    // Set DOM elements
    setElements(videoElement, canvasElement) {
      this.video = videoElement;
      this.canvas = canvasElement;
    }
  
    // Start verification process
    async startVerification() {
      try {
        // Start a session
        const sessionResponse = await this.apiRequest('/start', {
          method: 'POST'
        });
  
        if (!sessionResponse.success) {
          this.handleError();
          await Swal.fire({
            icon: 'error',
            text: 'Failed to Start Verification Session',
            showConfirmButton: false,
            toast: true,
            position: 'top-end',
            timer:2000,
          })
          window.location.reload();
          return false;
        }
  
        this.sessionId = sessionResponse.session_id;
        this.updateStatus('Session started. Setting up camera...');
  
        // Initialize webcam
        await this.setupWebcam();
        this.updateStatus('Position your face in the frame and capture when ready.');
        
        return true;
      } catch (error) {
        this.handleError();
        await Swal.fire({
          icon: 'error',
          text: 'Error Starting Verification',
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
          timer:2000,
        })
        window.location.reload();
        return false;
      }
    }
  
    // Set up webcam access
    async setupWebcam() {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });
        
        if (this.video) {
          this.video.srcObject = this.stream;
        } else {
          throw new Error('Video element not set');
        }
        
        return true;
      } catch (error) {
        this.handleError();
        await Swal.fire({
          icon: 'error',
          text: 'Please Allow Camera Access',
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
          timer:2000,
        })
        window.location.reload();
        return false;
      }
    }
  
    // Capture current frame from webcam
    captureFrame() {
      if (!this.video || !this.canvas) {
        this.handleError();
        Swal.fire({
          icon: 'error',
          text: 'Video or Canvas Element Not Set',
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
          timer:2000,
        })
        window.location.reload();
        return null;
      }
  
      const context = this.canvas.getContext('2d');
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      
      return new Promise((resolve) => {
        this.canvas.toBlob(blob => {
          resolve(blob);
        }, 'image/jpeg', 0.95);
      });
    }
  
    // Perform initial face detection
    async detectFace() {
      try {
        this.updateStatus('Detecting face...');
        
        const imageBlob = await this.captureFrame();
        if (!imageBlob) return false;
        
        const formData = new FormData();
        formData.append('image', imageBlob, 'face.jpg');
        formData.append('session_id', this.sessionId);
        
        const response = await this.apiRequest('/detect', {
          method: 'POST',
          body: formData
        });
        
        if (!response.success) {
          this.handleError();
          await Swal.fire({
            icon: 'error',
            text: 'Face Detection Failed',
            showConfirmButton: false,
            toast: true,
            position: 'top-end',
            timer:2000,
          })
          window.location.reload();
          return false;
        }
        
        this.currentChallenge = response.next_challenge;
        this.updateChallenge(this.currentChallenge);
        return true;
      } catch (error) {
        this.handleError();
        await Swal.fire({
          icon: 'error',
          text: 'Error in Face Detection',
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
          timer:2000,
        })
        window.location.reload();
        return false;
      }
    }
  
    // Perform liveness verification
    async verifyLiveness() {
      try {
        this.updateStatus(`Processing ${this.currentChallenge} challenge...`);
        
        const imageBlob = await this.captureFrame();
        if (!imageBlob) return false;
        
        const formData = new FormData();
        formData.append('image', imageBlob, 'challenge.jpg');
        formData.append('session_id', this.sessionId);
        formData.append('challenge_type', this.currentChallenge);
        
        const response = await this.apiRequest('/verify-liveness', {
          method: 'POST',
          body: formData
        });
        
        if (!response.success) {
          this.handleError();
          await Swal.fire({
            icon: 'error',
            text: 'Liveness Verification Failed',
            showConfirmButton: false,
            toast: true,
            position: 'top-end',
            timer:2000,
          })
          window.location.reload();
          return false;
        }
        
        if (response.verification_completed) {
          await this.completeVerification();
        } else {
          this.currentChallenge = response.next_challenge;
          this.updateChallenge(this.currentChallenge);
        }
        
        return true;
      } catch (error) {
        this.handleError();
        await Swal.fire({
          icon: 'error',
          text: 'Error in Liveness Verification',
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
          timer:2000,
        })
        window.location.reload();
        return false;
      }
    }
  
    // Complete verification process

  
    // Process capture based on current state
    async processCapture() {
      if (!this.sessionId) {
        await this.startVerification();
        return;
      }
      
      if (!this.currentChallenge) {
        await this.detectFace();
      } else {
        await this.verifyLiveness();
      }
    }
  
    // Clean up resources
    cleanup() {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
    }
  
    // Helper function for API requests
    async apiRequest(endpoint, options = {}) {
      const url = `${this.apiBaseUrl}${endpoint}`;
      
      // Add CSRF token for Laravel if needed
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        options.headers = options.headers || {};
        options.headers['X-CSRF-TOKEN'] = csrfToken;
      }
      
      try {
        const response = await fetch(url, options);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || `API error: ${response.status}`);
        }
        
        return data;
      } catch (error) {
        console.error('API request error:', error);
        throw error;
      }
    }
  
    // Update status message
    updateStatus(message) {
      console.log('Status:', message);
      if (this.onStatusUpdate) {
        this.onStatusUpdate(message);
      }
    }
  
    // Update challenge instructions
    updateChallenge(challenge) {
      let instructions = '';
      
      switch (challenge) {
        case 'blink':
          instructions = 'Please blink a few times naturally and press capture';
          break;
        case 'turn_head':
          instructions = 'Please turn your head slightly left or right and press capture';
          break;
        case 'smile':
          instructions = 'Please smile naturally and press capture';
          break;
        default:
          instructions = 'Follow the on-screen instructions and press capture';
      }
      
      if (this.onChallengeChange) {
        this.onChallengeChange(challenge, instructions);
      }
    }
  
    // Handle errors
    handleError() {  
      // If we have a session ID, send a cleanup request to the server
      if (this.sessionId) {
        this.apiRequest('/cleanup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: this.sessionId
          })
        }).catch(err => console.error('Cleanup request failed:', err));
      }
    }


    // Add this new method to the FaceVerificationClient class
    async submitRegistration() {
      try {
        if (!this.verificationToken || !this.sessionId) {
          this.handleError();
          await Swal.fire({
            icon: 'error',
            text: 'Missing Verification Token or Session ID',
            showConfirmButton: false,
            toast: true,
            position: 'top-end',
            timer:2000,
          })
          window.location.reload();
          return false;
        }
        
        this.updateStatus('Submitting registration data...');
        
        // Submit the registration data along with verification token and session ID
        const response = await fetch('/complete-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
          },
          body: JSON.stringify({
            verification_token: this.verificationToken,
            session_id: this.sessionId
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Registration submission failed');
        }
        
        this.updateStatus('Registration completed successfully!');
        
        // Redirect to a success page or handle as needed
        if (data.redirect) {
          await Swal.fire({
            icon: 'success',
            text: 'Verification Complete',
            showConfirmButton: false,
            toast: true,
            position: 'top-end',
            timer: 2000,
          });
          window.location.href = data.redirect;
        }
        
        return true;
      } catch (error) {
        this.handleError();
        await Swal.fire({
          icon: 'error',
          text: 'Error Submitting Registration',
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
          timer:2000,
        })
        window.location.reload();
        return false;
      }
    }

    // Modify the completeVerification method to automatically call submitRegistration
    async completeVerification() {
      try {
        this.updateStatus('Finalizing verification...');
        
        const response = await this.apiRequest('/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: this.sessionId
          })
        });
        
        if (!response.success) {
          this.handleError();
          await Swal.fire({
            icon: 'error',
            text: 'Failed to Complete Verification',
            showConfirmButton: false,
            toast: true,
            position: 'top-end',
            timer:2000,
          })
          window.location.reload();
          return false;
        }
        
        this.verificationToken = response.verification_token;
        this.updateStatus('Verification completed successfully!');
        
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        
        // Automatically submit registration with verification details
        await this.submitRegistration();
        
        if (this.onComplete) {
          this.onComplete(this.verificationToken);
        }
        
        return true;
      } catch (error) {
        this.handleError();
        await Swal.fire({
          icon: 'error',
          text: 'Error Completing Verification',
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
          timer:2000,
        })
        window.location.reload();
        return false;
      }
    }
  }
  