/**
 * Backend security utilities for input sanitization and validation
 */

/**
 * HTML entity encode special characters for XSS prevention
 * This preserves the original characters but encodes them safely
 */
export const encodeHtmlEntities = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Sanitize string input to prevent XSS and injection attacks
 * NOTE: This preserves quotes to allow names like O'Brien
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML/script injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim();
};

/**
 * Sanitize email input
 */
export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';
  
  // Only allow alphanumeric, @, ., -, _ characters
  return email.replace(/[^a-zA-Z0-9@._-]/g, '').trim().toLowerCase();
};

/**
 * Check if input contains potentially dangerous patterns
 */
export const containsDangerousPatterns = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;
  
  const dangerousPatterns = [
    /<script/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi,
    /expression\s*\(/gi, // CSS expressions
    /vbscript:/gi,
    /data:text\/html/gi,
    /union\s+select/gi, // SQL injection
    /drop\s+table/gi,
    /delete\s+from/gi,
    /insert\s+into/gi,
    /update\s+set/gi,
    /exec\s*\(/gi,
    /eval\s*\(/gi,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
};

/**
 * Validate and sanitize text input for forms
 */
export const sanitizeFormInput = (input: string, maxLength?: number): string => {
  if (!input) return '';
  
  let sanitized = sanitizeInput(input);
  
  // Check for dangerous patterns
  if (containsDangerousPatterns(sanitized)) {
    return ''; // Return empty if dangerous patterns found
  }
  
  // Apply length limit if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

