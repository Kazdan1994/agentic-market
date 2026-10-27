import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { type AgentFormInput, type AgentFormOutput, agentFormSchema, zodResolver } from "./agent-form.schema";
import { ApiError, type Category, useCreateAgent } from "./useAgents";

const SERVER_FIELDS: Record<string, keyof AgentFormInput> = {
  name: "name",
  perPurchaseCapMinor: "perPurchaseCap",
  totalBudgetMinor: "totalBudget",
  categorySlugs: "categorySlugs",
  expiresAt: "expiresAt",
};

const EMPTY: AgentFormInput = { name: "", perPurchaseCap: "", totalBudget: "", categorySlugs: [], expiresAt: "" };

interface CreateAgentFormProps {
  categories: Category[];
  onCreated?: (name: string) => void;
}

export function CreateAgentForm({ categories, onCreated }: CreateAgentFormProps) {
  const form = useForm<AgentFormInput, unknown, AgentFormOutput>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: EMPTY,
  });
  const createAgent = useCreateAgent();

  async function onSubmit(values: AgentFormOutput) {
    try {
      await createAgent.mutateAsync({
        name: values.name,
        perPurchaseCapMinor: values.perPurchaseCap,
        totalBudgetMinor: values.totalBudget,
        categorySlugs: values.categorySlugs,
        expiresAt: new Date(values.expiresAt).toISOString(),
      });
      form.reset(EMPTY);
      onCreated?.(values.name);
    } catch (error) {
      showServerError(error);
    }
  }

  function showServerError(error: unknown) {
    if (!(error instanceof ApiError)) {
      form.setError("root", { message: "Cannot reach the server. Please try again." });
      return;
    }
    const fieldErrors = error.code === "VALIDATION_FAILED" ? Object.entries(error.details ?? {}) : [];
    const mapped = fieldErrors.filter(([field]) => field in SERVER_FIELDS);
    for (const [field, messages] of mapped) {
      const message = Array.isArray(messages) ? String(messages[0]) : String(messages);
      form.setError(SERVER_FIELDS[field] as keyof AgentFormInput, { message });
    }
    if (mapped.length === 0) form.setError("root", { message: error.message });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Name" />
        <TextField name="expiresAt" label="Expires at" type="datetime-local" />
        <TextField name="perPurchaseCap" label="Per-purchase cap (EUR)" inputMode="decimal" />
        <TextField name="totalBudget" label="Total budget (EUR)" inputMode="decimal" />
        <FormField
          control={form.control}
          name="categorySlugs"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel asChild>
                <legend>Categories</legend>
              </FormLabel>
              <div className="flex flex-wrap gap-4">
                {categories.map((category) => {
                  const id = `category-${category.slug}`;
                  return (
                    <div key={category.slug} className="flex items-center gap-2">
                      <Checkbox
                        id={id}
                        checked={field.value.includes(category.slug)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked
                              ? [...field.value, category.slug]
                              : field.value.filter((slug) => slug !== category.slug),
                          )
                        }
                      />
                      <Label htmlFor={id}>{category.name}</Label>
                    </div>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p role="alert" className="text-sm text-danger sm:col-span-2">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting} className="sm:col-span-2 sm:justify-self-start">
          Create agent
        </Button>
      </form>
    </Form>
  );
}

type TextFieldProps = {
  name: Exclude<keyof AgentFormInput, "categorySlugs">;
  label: string;
  type?: string;
  inputMode?: "decimal";
};

function TextField({ name, label, type = "text", inputMode }: TextFieldProps) {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} inputMode={inputMode} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
