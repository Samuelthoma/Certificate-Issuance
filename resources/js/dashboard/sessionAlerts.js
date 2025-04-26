async function showSessionAlert() {
    const alertMessage = sessionStorage.getItem('alertMessage');

    if (alertMessage) {
        await Swal.fire({
            icon: 'error',
            text: alertMessage,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
        });

        sessionStorage.removeItem('alertMessage');
    }
}

export { showSessionAlert };
