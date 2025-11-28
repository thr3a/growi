import type { FC, InputHTMLAttributes } from 'react';
import { useState } from 'react';
import { debounce } from 'throttle-debounce';

import type { InputValidationResult } from '~/client/util/use-input-validator';

import styles from './RenameInput.module.scss';

const moduleClass = styles['rename-input'] ?? '';

type RenameInputProps = {
  inputProps: InputHTMLAttributes<HTMLInputElement> & { ref?: (r: HTMLInputElement | null) => void };
  validateName?: (name: string) => InputValidationResult | null;
  className?: string;
};

export const RenameInput: FC<RenameInputProps> = ({
  inputProps,
  validateName,
  className,
}) => {
  const [validationResult, setValidationResult] =
    useState<InputValidationResult | null>(null);

  const validate = debounce(300, (value: string) => {
    setValidationResult(validateName?.(value) ?? null);
  });

  const isInvalid = validationResult != null;

  return (
    <div className={`${moduleClass} ${className ?? ''} flex-fill`}>
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
        className={`form-control form-control-sm ${isInvalid ? 'is-invalid' : ''}`}
      />
      {isInvalid && (
        <div className="invalid-feedback d-block my-1">
          {validationResult.message}
        </div>
      )}
    </div>
  );
};
