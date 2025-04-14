<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class GenerateCAKeys extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ca:generate-keys {--days=365 : Validity period in days}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate self-signed CA private key and certificate';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Generating CA private key and certificate...');
        
        // Create the storage directory if it doesn't exist
        $storagePath = 'app/private/ca';
        $fullPath = storage_path($storagePath);
        
        if (!file_exists($fullPath)) {
            mkdir($fullPath, 0700, true);
            $this->info("Created directory: {$fullPath}");
        }
        
        // File paths
        $privateKeyPath = "{$fullPath}/ca.key";
        $certificatePath = "{$fullPath}/ca.crt";
        $csrPath = "{$fullPath}/ca.csr";
        
        // Generate private key
        $this->info('Generating private key...');
        $privateKey = openssl_pkey_new([
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);
        
        if (!$privateKey) {
            $this->error('Failed to generate private key: ' . openssl_error_string());
            return 1;
        }
        
        // Export private key to PEM format
        openssl_pkey_export($privateKey, $privateKeyPem);
        file_put_contents($privateKeyPath, $privateKeyPem);
        chmod($privateKeyPath, 0600); // Restrictive permissions for private key
        
        $this->info("Private key saved to: {$privateKeyPath}");
        
        // Create CSR (Certificate Signing Request)
        $this->info('Creating certificate signing request...');
        $dn = [
            "countryName" => "KH",
            "stateOrProvinceName" => "Jawa",
            "localityName" => "Cikarang",
            "organizationName" => "Clarisign",
            "organizationalUnitName" => "Certificate Authority",
            "commonName" => "My CA",
            "emailAddress" => "clarisign@gmail.com"
        ];
        
        $csr = openssl_csr_new($dn, $privateKey);
        if (!$csr) {
            $this->error('Failed to generate CSR: ' . openssl_error_string());
            return 1;
        }
        
        // Optional: Save CSR
        openssl_csr_export($csr, $csrPem);
        file_put_contents($csrPath, $csrPem);
        
        // Self-sign the certificate
        $this->info('Self-signing certificate...');
        $days = $this->option('days');
        $x509 = openssl_csr_sign($csr, null, $privateKey, $days, [
            'digest_alg' => 'sha256',
            'x509_extensions' => 'v3_ca',
        ]);
        
        if (!$x509) {
            $this->error('Failed to sign certificate: ' . openssl_error_string());
            return 1;
        }
        
        // Export certificate to PEM format
        openssl_x509_export($x509, $certificatePem);
        file_put_contents($certificatePath, $certificatePem);
        
        $this->info("Certificate saved to: {$certificatePath}");
        $this->info('CA key and certificate generation completed successfully!');
        
        // Display certificate information
        $certInfo = openssl_x509_parse($certificatePem);
        $this->info('Certificate Information:');
        $this->info("Subject: {$certInfo['name']}");
        $this->info("Valid From: " . date('Y-m-d H:i:s', $certInfo['validFrom_time_t']));
        $this->info("Valid To: " . date('Y-m-d H:i:s', $certInfo['validTo_time_t']));
        
        return 0;
    }
}