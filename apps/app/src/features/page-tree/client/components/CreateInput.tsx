import type { FC, InputHTMLAttributes } from 'react';
import { useState } from 'react';
import { debounce } from 'throttle-debounce';

import type { InputValidationResult } from '~/client/util/use-input-validator';

import styles from './CreateInput.module.scss';

const wrapperClass = styles['create-input-wrapper'] ?? '';
const inputClass = styles['create-input'] ?? '';

type CreateInputProps = {
  inputProps: InputHTMLAttributes<HTMLInputElement> & {
    ref?: (r: HTMLInputElement | null) => void;
  };
  validateName?: (name: string) => InputValidationResult | null;
  className?: string;
  placeholder?: string;
};

export const CreateInput: FC<CreateInputProps> = ({
  inputProps,
  validateName,
  className,
  placeholder = 'New Page',
}) => {
  const [validationResult, setValidationResult] =
    useState<InputValidationResult | null>(null);

  const validate = debounce(300, (value: string) => {
    setValidationResult(validateName?.(value) ?? null);
  });

  const isInvalid = validationResult != null;

  return (
    <div className={`${wrapperClass} ${className ?? ''}`}>
      <div className={`${inputClass} flex-fill`}>
        <input
          {...inputProps}
          onChange={(e) => {
            inputProps.onChange?.(e);
            validate(e.target.value);
          }}
          onBlur={(e) => {
            setValidationResult(null);
            inputProps.onBlur?.(e);
          }}
          type="text"
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
