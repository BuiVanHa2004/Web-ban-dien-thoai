package com.webbanhang.shop.Security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import com.webbanhang.shop.Repository.Admins.AdminAccountRepository;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;

import java.io.IOException;
import java.util.List;

@Component
@ConditionalOnBean(JwtService.class)
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomerAccountRepository customerAccountRepository;
    private final AdminAccountRepository adminAccountRepository;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            CustomerAccountRepository customerAccountRepository,
            AdminAccountRepository adminAccountRepository
    ) {
        this.jwtService = jwtService;
        this.customerAccountRepository = customerAccountRepository;
        this.adminAccountRepository = adminAccountRepository;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Claims claims = jwtService.parseClaims(token);
                String subject = claims.getSubject();
                String role = String.valueOf(claims.get("role"));
                if (subject != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    if (!isSubjectActive(subject)) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
                        return;
                    }
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            subject,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + role))
                    );
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (Exception ignored) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isSubjectActive(String subject) {
        try {
            if (subject.startsWith("customer:")) {
                int id = Integer.parseInt(subject.substring("customer:".length()));
                var customer = customerAccountRepository.findById(id).orElse(null);
                if (customer == null) return false;
                if (customer.getDeletedAt() != null) return false;
                return customer.getIsActive() == null || customer.getIsActive();
            }
            if (subject.startsWith("admin:")) {
                int id = Integer.parseInt(subject.substring("admin:".length()));
                var admin = adminAccountRepository.findById(id).orElse(null);
                if (admin == null) return false;
                return admin.getDeletedAt() == null;
            }
        } catch (Exception ignored) {
            return false;
        }
        return false;
    }
}
