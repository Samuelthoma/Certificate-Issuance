
## 📄 Setup Instructions

1. Put the `firebase_credentials` file into the `storage/app/firebase/` directory.
2. Place the `ca.csr`, `ca.key`, and `ca.crt` files into the `storage/app/private/ca/` directory.

   *(Just create the folder if it doesn't exist.)*
3. Turn on XAMPP (Apache and MySQL))
4. Run `composer install`.
5. Run `npm install`.
6. Run `php artisan migrate`.
7. Generate a personal access client using:

   `php artisan passport:client --personal`

   *(When prompted, fill in the required client information.)*
8. Run `php artisan passport:install`. (Run this first if step 7 doesn’t work)
9. Open 3 different terminals to run the following three commands.
10. Navigate to the Python directory:

    `cd app/python`
11. Run the OCR API script:

    `python ocr_api.py`
12. Run the frontend dev server:

    `npm run dev`
13. Start the Laravel development server:

    `php artisan serve`
