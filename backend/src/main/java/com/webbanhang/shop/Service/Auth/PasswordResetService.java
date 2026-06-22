package com.webbanhang.shop.Service.Auth;

import com.webbanhang.shop.Model.Admins.AdminAccount;
import com.webbanhang.shop.Model.Auth.PasswordResetCode;
import com.webbanhang.shop.Model.Customers.CustomerAccount;
import com.webbanhang.shop.Repository.Admins.AdminAccountRepository;
import com.webbanhang.shop.Repository.Auth.PasswordResetCodeRepository;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;
import com.webbanhang.shop.Service.Email.GmailApiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private static final Duration CODE_TTL = Duration.ofMinutes(10);

    private static final Duration MIN_RESEND_INTERVAL = Duration.ofSeconds(60);
    private static final int MAX_SENDS_PER_HOUR = 5;
    private static final int MAX_SENDS_PER_DAY = 20;

    private final CustomerAccountRepository customerAccountRepository;
    private final AdminAccountRepository adminAccountRepository;
    private final PasswordResetCodeRepository passwordResetCodeRepository;
    private final PasswordEncoder passwordEncoder;
    private final BCryptPasswordEncoder otpEncoder; // Encoder riêng cho OTP với cost thấp hơn
    private final GmailApiService gmailApiService;

    public PasswordResetService(
            CustomerAccountRepository customerAccountRepository,
            AdminAccountRepository adminAccountRepository,
            PasswordResetCodeRepository passwordResetCodeRepository,
            PasswordEncoder passwordEncoder,
            GmailApiService gmailApiService
    ) {
        this.customerAccountRepository = customerAccountRepository;
        this.adminAccountRepository = adminAccountRepository;
        this.passwordResetCodeRepository = passwordResetCodeRepository;
        this.passwordEncoder = passwordEncoder;
        // OTP chỉ sống 10 phút nên dùng cost=4 thay vì 10 (mặc định) để nhanh hơn ~64 lần
        this.otpEncoder = new BCryptPasswordEncoder(4);
        this.gmailApiService = gmailApiService;
        log.info("PasswordResetService initialized with Gmail API.");
    }

    @Transactional
    public void requestReset(String usernameOrEmailOrEmailField) {
        String key = usernameOrEmailOrEmailField == null ? "" : usernameOrEmailOrEmailField.trim();
        if (key.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập email.");
        }

        String email = resolveEmail(key);
        if (email == null || email.isBlank()) {
            // Không tiết lộ thông tin tài khoản: luôn trả về thành công ở controller.
            log.warn("Password reset skipped: no account found for identifier '{}'", maskIdentifier(key));
            return;
        }

        String emailLower = email.toLowerCase(Locale.ROOT);
        Instant now = Instant.now();

        // Chống spam: giới hạn tần suất gửi OTP.
        PasswordResetCode last = passwordResetCodeRepository
                .findFirstByEmailOrderByCreatedAtDesc(emailLower)
                .orElse(null);

        if (last != null && last.getCreatedAt() != null) {
            Duration sinceLast = Duration.between(last.getCreatedAt(), now);
            if (!sinceLast.isNegative() && sinceLast.compareTo(MIN_RESEND_INTERVAL) < 0) {
                long remainingSeconds = MIN_RESEND_INTERVAL.minus(sinceLast).getSeconds();
                if (remainingSeconds < 1) remainingSeconds = 1;
                throw new IllegalArgumentException(
                        "Bạn thao tác quá nhanh. Vui lòng thử lại sau " + remainingSeconds + " giây."
                );
            }
        }

        long sentLastHour = passwordResetCodeRepository.countByEmailAndCreatedAtAfter(
                emailLower,
                now.minus(Duration.ofHours(1))
        );
        if (sentLastHour >= MAX_SENDS_PER_HOUR) {
            throw new IllegalArgumentException(
                    "Bạn đã yêu cầu gửi mã quá nhiều lần trong 1 giờ. Vui lòng thử lại sau."
            );
        }

        long sentLastDay = passwordResetCodeRepository.countByEmailAndCreatedAtAfter(
                emailLower,
                now.minus(Duration.ofDays(1))
        );
        if (sentLastDay >= MAX_SENDS_PER_DAY) {
            throw new IllegalArgumentException(
                    "Bạn đã yêu cầu gửi mã quá nhiều lần trong 1 ngày. Vui lòng thử lại sau."
            );
        }

        String code = generate6DigitCode();

        PasswordResetCode entity = new PasswordResetCode();
        entity.setEmail(emailLower);
        entity.setCodeHash(otpEncoder.encode(code)); // Dùng otpEncoder thay vì passwordEncoder
        entity.setExpiresAt(now.plus(CODE_TTL));
        passwordResetCodeRepository.save(entity);

        sendOtpEmail(email, code);
    }

    public void verifyCode(String usernameOrEmail, String code) {
        String key = usernameOrEmail == null ? "" : usernameOrEmail.trim();
        String otp = code == null ? "" : code.trim();

        if (key.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập email.");
        }
        if (otp.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập mã xác thực.");
        }

        String email = resolveEmail(key);
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Mã xác thực không hợp lệ.");
        }

        String emailLower = email.toLowerCase(Locale.ROOT);

        PasswordResetCode prc = passwordResetCodeRepository
                .findFirstByEmailAndUsedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(emailLower, Instant.now())
                .orElseThrow(() -> new IllegalArgumentException("Mã xác thực không hợp lệ hoặc đã hết hạn."));

        if (!otpEncoder.matches(otp, prc.getCodeHash())) {
            throw new IllegalArgumentException("Mã xác thực không hợp lệ.");
        }

        if (prc.getVerifiedAt() == null) {
            prc.setVerifiedAt(Instant.now());
            passwordResetCodeRepository.save(prc);
        }
    }

    public void resetPassword(String usernameOrEmail, String code, String newPassword) {
        String key = usernameOrEmail == null ? "" : usernameOrEmail.trim();
        String otp = code == null ? "" : code.trim();
        String np = newPassword == null ? "" : newPassword;

        if (key.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập email.");
        }
        if (otp.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập mã xác thực.");
        }
        if (np.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập mật khẩu mới.");
        }
        if (np.length() < 8) {
            throw new IllegalArgumentException("Mật khẩu phải có tối thiểu 8 ký tự.");
        }

        String email = resolveEmail(key);
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Mã xác thực không hợp lệ.");
        }

        String emailLower = email.toLowerCase(Locale.ROOT);

        PasswordResetCode prc = passwordResetCodeRepository
                .findFirstByEmailAndUsedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(emailLower, Instant.now())
                .orElseThrow(() -> new IllegalArgumentException("Mã xác thực không hợp lệ hoặc đã hết hạn."));

        if (!otpEncoder.matches(otp, prc.getCodeHash())) {
            throw new IllegalArgumentException("Mã xác thực không hợp lệ.");
        }

        // Update password (customer or admin)
        CustomerAccount customer = customerAccountRepository.findByEmail(emailLower).orElse(null);
        if (customer != null) {
            customer.setPassword(passwordEncoder.encode(np));
            customerAccountRepository.save(customer);
            prc.setUsedAt(Instant.now());
            passwordResetCodeRepository.save(prc);
            return;
        }

        AdminAccount admin = adminAccountRepository.findByEmailAndDeletedAtIsNull(emailLower).orElse(null);
        if (admin != null) {
            admin.setPassword(passwordEncoder.encode(np));
            adminAccountRepository.save(admin);
            prc.setUsedAt(Instant.now());
            passwordResetCodeRepository.save(prc);
            return;
        }

        // Không tiết lộ tài khoản
        prc.setUsedAt(Instant.now());
        passwordResetCodeRepository.save(prc);
    }

    private String resolveEmail(String key) {
        String keyTrim = key.trim();
        String keyLower = keyTrim.toLowerCase(Locale.ROOT);

        if (keyTrim.contains("@")) {
            // Nếu nhập email, thử tìm trực tiếp
            CustomerAccount customer = customerAccountRepository.findByEmail(keyLower).orElse(null);
            if (customer != null && customer.getEmail() != null) return customer.getEmail();

            AdminAccount admin = adminAccountRepository.findByEmailAndDeletedAtIsNull(keyLower).orElse(null);
            if (admin != null && admin.getEmail() != null) return admin.getEmail();

            return null;
        }

        // Nếu nhập username
        CustomerAccount customer = customerAccountRepository.findByUsername(keyTrim).orElse(null);
        if (customer != null && customer.getEmail() != null) return customer.getEmail();

        AdminAccount admin = adminAccountRepository.findByUsernameAndDeletedAtIsNull(keyTrim).orElse(null);
        if (admin != null && admin.getEmail() != null) return admin.getEmail();

        return null;
    }

    private String generate6DigitCode() {
        SecureRandom random = new SecureRandom();
        int n = 100000 + random.nextInt(900000);
        return String.valueOf(n);
    }

    private void sendOtpEmail(String to, String code) {
        try {
            String htmlContent = buildOtpEmailHtml(code);
            gmailApiService.sendHtmlEmail(
                    to,
                    "MyPhone Store - Mã xác thực đặt lại mật khẩu",
                    htmlContent
            );
            log.info("Sent password reset OTP to {}", to);
        } catch (Exception ex) {
            log.error("Failed to send password reset OTP email to {}", to, ex);
        }
    }

    private String buildOtpEmailHtml(String code) {
        return "<!DOCTYPE html>" +
                "<html><head><meta charset='UTF-8'></head><body>" +
                "<div style='max-width:600px;margin:0 auto;font-family:Arial,sans-serif'>" +
                "<div style='background:#007bff;color:white;padding:20px;text-align:center'>" +
                "<h1>MyPhone Store</h1>" +
                "<p>Đặt lại mật khẩu</p></div>" +
                "<div style='padding:20px;background:#f9f9f9'>" +
                "<p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>" +
                "<div style='background:white;padding:20px;border-radius:8px;text-align:center;margin:20px 0;border:2px solid #007bff'>" +
                "<p style='color:#666;margin:0'>Mã xác thực của bạn là:</p>" +
                "<h2 style='color:#007bff;letter-spacing:8px;font-size:36px;margin:10px 0'>" + code + "</h2>" +
                "<p style='color:#666;margin:0'>Mã có hiệu lực trong " + CODE_TTL.toMinutes() + " phút.</p>" +
                "</div>" +
                "<p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>" +
                "</div>" +
                "<div style='text-align:center;padding:20px;color:#666;font-size:12px'>" +
                "<p><strong>MyPhone Store</strong></p>" +
                "<p>&copy; 2024 MyPhone Store. All rights reserved.</p>" +
                "</div>" +
                "</div></body></html>";
    }
}
