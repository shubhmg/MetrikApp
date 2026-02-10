import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  defaultRadius: 'lg',
  components: {
    Button: { defaultProps: { size: 'md' } },
    TextInput: { defaultProps: { size: 'md' } },
    Select: { defaultProps: { size: 'md' } },
    PasswordInput: { defaultProps: { size: 'md' } },
    NumberInput: { defaultProps: { size: 'md' } },
    Textarea: { defaultProps: { size: 'md' } },
    MultiSelect: { defaultProps: { size: 'md' } },
    DateInput: { defaultProps: { size: 'md' } },
    Modal: {
      defaultProps: { radius: 'lg', centered: true },
    },
    Card: {
      defaultProps: { radius: 'lg' },
    },
    Paper: {
      defaultProps: { radius: 'lg' },
    },
  },
});
