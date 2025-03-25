/**
 * useForm hook for form handling with validation
 * 
 * This hook provides a unified way to manage form state, validation, and submission.
 * It supports:
 * - Type-safe form values
 * - Field-level validation
 * - Form-level validation
 * - Error handling
 * - Touched state tracking
 * - Submission handling
 */

import { useState, useCallback, useMemo } from 'react';

export type ValidationError = string;

export type FieldValidator<T> = (value: T) => ValidationError | undefined | null | '';

export type FormErrors<Values> = {
  [K in keyof Values]?: ValidationError;
};

export type FormTouched<Values> = {
  [K in keyof Values]?: boolean;
};

export interface UseFormProps<Values> {
  initialValues: Values;
  onSubmit: (values: Values) => void | Promise<void>;
  validate?: (values: Values) => FormErrors<Values>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  validators?: {
    [K in keyof Values]?: FieldValidator<Values[K]>;
  };
}

export interface UseFormReturn<Values> {
  // Form state
  values: Values;
  errors: FormErrors<Values>;
  touched: FormTouched<Values>;
  isSubmitting: boolean;
  isValid: boolean;
  dirty: boolean;
  
  // Handlers
  handleChange: <K extends keyof Values>(field: K) => (value: Values[K]) => void;
  handleBlur: <K extends keyof Values>(field: K) => () => void;
  setFieldValue: <K extends keyof Values>(field: K, value: Values[K]) => void;
  setFieldError: <K extends keyof Values>(field: K, error: ValidationError) => void;
  setFieldTouched: <K extends keyof Values>(field: K, isTouched?: boolean) => void;
  setValues: (values: Values) => void;
  resetForm: () => void;
  submitForm: () => Promise<void>;
  validateForm: () => FormErrors<Values>;
  validateField: <K extends keyof Values>(field: K) => ValidationError | undefined;
}

/**
 * Hook for managing form state with validation
 * @param props - Form configuration
 * @returns Form state and handlers
 */
export function useForm<Values extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate,
  validateOnChange = true,
  validateOnBlur = true,
  validateOnSubmit = true,
  validators = {},
}: UseFormProps<Values>): UseFormReturn<Values> {
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<FormErrors<Values>>({});
  const [touched, setTouched] = useState<FormTouched<Values>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [initialValuesMemo] = useState<Values>(initialValues);

  // Check if the form has been modified
  const dirty = useMemo(() => {
    return Object.keys(initialValuesMemo).some(
      (key) => initialValuesMemo[key] !== values[key]
    );
  }, [initialValuesMemo, values]);

  // Determine if the form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Validate a single field
  const validateField = useCallback(<K extends keyof Values>(field: K): ValidationError | undefined => {
    const fieldValidator = validators[field];
    if (fieldValidator) {
      const fieldError = fieldValidator(values[field]);
      if (fieldError) {
        return fieldError;
      }
    }
    return undefined;
  }, [validators, values]);

  // Validate the entire form
  const validateForm = useCallback((): FormErrors<Values> => {
    // First run field-level validation
    const fieldErrors: FormErrors<Values> = {};
    Object.keys(values).forEach((key) => {
      const fieldKey = key as keyof Values;
      const fieldError = validateField(fieldKey);
      if (fieldError) {
        fieldErrors[fieldKey] = fieldError;
      }
    });

    // Then run form-level validation if provided
    if (validate) {
      const formErrors = validate(values);
      return { ...fieldErrors, ...formErrors };
    }

    return fieldErrors;
  }, [validateField, validate, values]);

  // Update a field value
  const setFieldValue = useCallback(<K extends keyof Values>(field: K, value: Values[K]) => {
    setValues((prevValues) => ({ ...prevValues, [field]: value }));
    
    if (validateOnChange) {
      const fieldError = validateField(field);
      setErrors((prevErrors) => ({
        ...prevErrors,
        [field]: fieldError || undefined,
      }));
    }
  }, [validateField, validateOnChange]);

  // Handle field change
  const handleChange = useCallback(<K extends keyof Values>(field: K) => (value: Values[K]) => {
    setFieldValue(field, value);
  }, [setFieldValue]);

  // Set a field as touched
  const setFieldTouched = useCallback(<K extends keyof Values>(
    field: K,
    isTouched: boolean = true
  ) => {
    setTouched((prevTouched) => ({ ...prevTouched, [field]: isTouched }));
    
    if (validateOnBlur && isTouched) {
      const fieldError = validateField(field);
      setErrors((prevErrors) => ({
        ...prevErrors,
        [field]: fieldError || undefined,
      }));
    }
  }, [validateField, validateOnBlur]);

  // Handle field blur
  const handleBlur = useCallback(<K extends keyof Values>(field: K) => () => {
    setFieldTouched(field, true);
  }, [setFieldTouched]);

  // Set a field error
  const setFieldError = useCallback(<K extends keyof Values>(
    field: K,
    error: ValidationError
  ) => {
    setErrors((prevErrors) => ({ ...prevErrors, [field]: error }));
  }, []);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Submit the form
  const submitForm = useCallback(async () => {
    // Mark all fields as touched
    const touchedFields = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as FormTouched<Values>
    );
    setTouched(touchedFields);

    // Validate if needed
    if (validateOnSubmit) {
      const formErrors = validateForm();
      setErrors(formErrors);
      
      // Don't proceed if there are errors
      if (Object.keys(formErrors).length > 0) {
        return;
      }
    }
    
    // Process submission
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, validateOnSubmit, values, onSubmit]);

  return {
    // Form state
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    dirty,
    
    // Handlers
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setValues,
    resetForm,
    submitForm,
    validateForm,
    validateField,
  };
} 