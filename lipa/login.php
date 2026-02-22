<?php
session_start();

define('DB_HOST', getenv('DB_HOST'));
define('DB_NAME', getenv('DB_NAME'));
define('DB_USER', getenv('DB_USER'));
define('DB_PASS', getenv('DB_PASS'));

$dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
$options = [
    PDO::ATTR_ERRMODE               => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE    => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES      => false,
];

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    error_log("Database connection failed: " . $e->getMessage(), 0);
    die("<h1>Database connection error. Please try again later.</h1>");
}

function generateVerificationCode($length = 6) {
    return str_pad(random_int(0, pow(10, $length) - 1), $length, '0', STR_PAD_LEFT);
}

function sendVerificationEmail($recipientEmail, $code) {
    
    $to = $recipientEmail;
    $subject = "Your Account Verification Code";
    
    $verification_link = "https://metrogain.co.ke/verify.php";

    $message_body = "
<!DOCTYPE html>
<html>
<head>
    <title>Account Verification</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
        .header { background-color: #E8E3DD; color: #ffffff; padding: 20px; text-align: center; }
        .header img { max-width: 150px; height: auto; }
        .content { padding: 20px 30px; line-height: 1.6; color: #333333; }
        .code-display { text-align: center; margin: 20px 0; padding: 15px; background-color: #f0f8ff; border: 1px dashed #6a0dad; border-radius: 5px; font-size: 24px; font-weight: bold; color: #6a0dad; letter-spacing: 5px; }
        .footer { background-color: #f0f0f0; color: #777777; padding: 20px; text-align: center; font-size: 12px; }
        .footer a { color: #007bff; text-decoration: none; margin: 0 5px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <img src='https://metrogain.co.ke/img/logo.png' alt='metrogain Logo'>
        </div>
        <div class='content'>
            <p>Hello,</p>
            <p>To complete your login, please use the following 6-digit verification code to activate your account:</p>
                        <p>If the email was sent to your Spam folder, please open it and click <b> Not Spam.</b></p>

            <div class='code-display'>". htmlspecialchars($code) . "</div>
            
            <p>The metrogain Team</p>
        </div>
        <div class='footer'>
            <p>&copy; " . date('Y') . " metrogain. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
";

    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: metrogai@metrogain.co.ke" . "\r\n";
    
    mail($to, $subject, $message_body, $headers);
}

$message = '';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST['login-username']);
    $password = $_POST['login-password'];

    if (empty($username) || empty($password)) {
        $message = '<div class="notification error">Please enter both a username and password.</div>';
    } else {
        try {
            $sql = "SELECT id, email, password_hash, status, is_verified FROM users WHERE username = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$username]);

            if ($stmt->rowCount() > 0) {
                $user = $stmt->fetch();
                $hashed_password = $user['password_hash'];
                $user_status = strtolower($user['status']);
                $is_verified = (int)$user['is_verified'];

                if ($user_status === 'banned') {
                    $message = '<div class="notification error">❌ Your account was recently <b>flagged</b> due to unusual activity. Please contact the support team for assistance
                  
                   <a href="https://wa.me/14792314120?text=hello%20Metrogain,%20help%20my%20account%20is%20banned">TAP HERE</a>
                    
                    </div>';
                    
                } elseif (password_verify($password, $hashed_password)) {
                    
                    if ($is_verified === 0) {
                        $new_code = generateVerificationCode();
                        
                        $update_stmt = $pdo->prepare("UPDATE users SET verification_code = ? WHERE id = ?");
                        $update_stmt->execute([$new_code, $user['id']]);
                        
                        sendVerificationEmail($user['email'], $new_code);
                        
                        $_SESSION['verification_email'] = $user['email']; 
                        
                        $message = '<div class="notification error">🔒 Your account is not yet activated. A **NEW** verification code has been sent to your email. Redirecting to verification...</div>';
                        header("Refresh: 3; URL=verify.php");
                        exit();
                    }

                    $_SESSION['loggedin'] = true;
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['username'] = $username;

                    $message = '<div class="notification success">✅ Login successful! Redirecting...</div>';
                    header("Refresh: 2; URL=index.php");
                    exit();
                } else {
                    $message = '<div class="notification error">Invalid username or password.</div>';
                }
            } else {
                $message = '<div class="notification error">Invalid username or password.</div>';
            }
        } catch (PDOException $e) {
            $message = '<div class="notification error">An unexpected error occurred during login. Please try again later.</div>';
            error_log("Login failed: " . $e->getMessage(), 0);
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/x-icon" href="img/icon.png">
    <title>METROGAIN INVESTMENTS - Login</title>
    <style>
        body {
            font-family: sans-serif;
            background-color: #f0e6ff;
            display: flex;
            color: #333;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            position: relative;
        }

        .auth-container {
            width: 100%;
            max-width: 400px;
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            padding: 40px;
            text-align: center;
            margin-bottom: 80px;
        }

        .auth-section h2 {
            font-size: 28px;
            color: #6a0dad;
            margin-bottom: 25px;
            font-weight: bold;
        }

        .auth-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .form-group {
            text-align: left;
            position: relative;
        }

        .form-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid #dddddd;
            border-radius: 10px;
            font-size: 16px;
            box-sizing: border-box;
            transition: border-color 0.3s, box-shadow 0.3s;
        }

        .form-group input:focus {
            outline: none;
            border-color: #6a0dad;
            box-shadow: 0 0 0 3px rgba(106, 13, 173, 0.2);
        }

        .btn {
            width: 100%;
            padding: 15px;
            background-color: #6a0dad;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            cursor: pointer;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 15px rgba(106, 13, 173, 0.4);
        }

        .auth-section p {
            margin-top: 25px;
            color: #666666;
            font-size: 14px;
        }

        .auth-section a {
            color: #6a0dad;
            text-decoration: none;
            font-weight: bold;
        }

        .auth-section a:hover {
            text-decoration: underline;
        }

        .notification {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            font-size: 16px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .notification.success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .notification.error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .password-container {
            position: relative;
        }

        .password-container input {
            padding-right: 40px;
        }

        .toggle-password {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #888;
            font-size: 20px;
        }

        .toggle-password:hover {
            color: #333;
        }

        .footer-bottom {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            background: transparent;
            color: #666;
            text-align: center;
            padding: 15px 0;
            font-size: 14px;
        }

        .footer-bottom a {
            color: #6a0dad;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }

        .footer-bottom a:hover {
            color: #4b0a72;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="auth-section">
            <h2>Login</h2>
            
            <?php echo $message; ?>

            <form action="<?php echo htmlspecialchars($_SERVER['PHP_SELF']); ?>" method="post" class="auth-form">
                <div class="form-group">
                    <input type="text" name="login-username" placeholder="Username" required>
                </div>

                <div class="form-group password-container">
                    <input type="password" id="password" name="login-password" placeholder="Password" required>
                    <span class="toggle-password" id="togglePassword">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2.06 13.91C3.12 11.87 6.47 6 12 6c5.53 0 8.88 5.87 9.94 7.91M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                        </svg>
                    </span>
                </div>
                <button type="submit" class="btn">Login</button>
            </form>
            <p>Forgotten Password? <a href="forgot_password.php">Forgotten Password</a></p>
            <p>Don't have an account? <a href="signup.php">Sign Up</a></p>
        </div>
            <div class="footer-bottom"> 
        &copy; 2025 MetroGain. All Rights Reserved.
    </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const togglePassword = document.querySelector('#togglePassword');
            const password = document.querySelector('#password');

            if (togglePassword && password) {
                togglePassword.addEventListener('click', function (e) {
                    const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
                    password.setAttribute('type', type);
                    
                    const path = this.querySelector('path');
                    if (type === 'text') {
                        path.setAttribute('d', 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.05 3.19M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM1 1l22 22');
                    } else {
                        path.setAttribute('d', 'M2.06 13.91C3.12 11.87 6.47 6 12 6c5.53 0 8.88 5.87 9.94 7.91M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z');
                    }
                });
            }
        });
    </script>
</body>
</html>
