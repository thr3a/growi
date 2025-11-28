import type { CSSProperties, FC, KeyboardEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { debounce } from 'throttle-debounce';

import type { InputValidationResult } from '~/client/util/use-input-validator';

import styles from './CreateInput.module.scss';

const wrapperClass = styles['create-input-wrapper'] ?? '';
const inputClass = styles['create-input'] ?? '';

type CreateInputProps = {
  validateName?: (name: string) => InputValidationResult | null;
  onSubmit?: (value: string) => void;
  onCancel?: () => void;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
};

export const CreateInput: FC<CreateInputProps> = ({
  validateName,
  onSubmit,
  onCancel,
  className,
  style,
  placeholder = 'New Page',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [validationResult, setValidationResult] =
    useState<InputValidationResult | null>(null);

  // Auto focus on mount
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const validate = debounce(300, (inputValue: string) => {
    setValidationResult(validateName?.(inputValue) ?? null);
  });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      validate(newValue);
    },
    [validate],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (validationResult == null && value.trim() !== '') {
          onSubmit?.(value);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    },
    [value, validationResult, onSubmit, onCancel],
  );

  const handleBlur = useCallback(() => {
    // Cancel if blurred without submitting
    // Delay to allow click events on submit button (if any)
    setTimeout(() => {
      onCancel?.();
    }, 150);
  }, [onCancel]);

  const isInvalid = validationResult != null;

  return (
    <div className={`${wrapperClass} ${className ?? ''}`} style={style}>
      <div className={`${inputClass} flex-fill`}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`form-control form-control-sm ${isInvalid ? 'is-invalid' : ''}`}
        />
        {isInvalid && (
          <div className="invalid-feedback d-block my-1">
            {validationResult.message}
          </div>
        )}
      </div>
    </div>
  );
};
