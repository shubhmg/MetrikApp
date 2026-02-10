import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'teal',
  fontFamily: '"Plus Jakarta Sans", "DM Sans", "Inter", system-ui, sans-serif',
  defaultRadius: 'lg',
  colors: {
    teal: [
      '#e6fcf5',
      '#c3fae8',
      '#96f2d7',
      '#63e6be',
      '#38d9a9',
      '#20c997',
      '#12b886',
      '#0ca678',
      '#099268',
      '#087f5b',
    ],
  },
  primaryShade: { light: 6, dark: 5 },
  fontSizes: {
    xs: '0.7rem',
    sm: '0.8rem',
    md: '0.9rem',
    lg: '1rem',
    xl: '1.1rem',
  },
  headings: {
    fontFamily: '"Space Grotesk", "Plus Jakarta Sans", system-ui, sans-serif',
    fontWeight: '700',
  },
  components: {
    Button: { defaultProps: { size: 'md', radius: 'md' } },
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
