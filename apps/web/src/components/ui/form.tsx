import { Slot } from "@radix-ui/react-slot";
import { type ComponentProps, createContext, useContext, useId } from "react";
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
  useFormState,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "./label";

export const Form = FormProvider;

const FormFieldContext = createContext<{ name: string } | null>(null);
const FormItemContext = createContext<{ id: string } | null>(null);

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

function useFormField() {
  const field = useContext(FormFieldContext);
  const item = useContext(FormItemContext);
  if (!field || !item) throw new Error("useFormField must be used inside <FormField> and <FormItem>");
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: field.name });
  const { error } = getFieldState(field.name, formState);
  return {
    error,
    formItemId: `${item.id}-item`,
    formDescriptionId: `${item.id}-description`,
    formMessageId: `${item.id}-message`,
  };
}

export function FormItem({ className, ...props }: ComponentProps<"div">) {
  const id = useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn("flex flex-col gap-1.5", className)} {...props} />
    </FormItemContext.Provider>
  );
}

export function FormLabel({ className, ...props }: ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();
  return <Label className={cn(error && "text-red-600", className)} htmlFor={formItemId} {...props} />;
}

export function FormControl(props: ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot
      id={formItemId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={!!error}
      {...props}
    />
  );
}

export function FormMessage({ className, ...props }: ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  if (!error?.message) return null;
  return (
    <p id={formMessageId} className={cn("text-sm text-red-600", className)} {...props}>
      {error.message}
    </p>
  );
}
