import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Stack,
  Title,
  Text,
  Alert,
  Center,
  Box,
  Anchor,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { useAuth } from '../hooks/useAuth.js';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 48em)');

  const form = useForm({
    initialValues: { name: '', email: '', password: '' },
    validate: {
      name: (v) => (isRegister && !v.trim() ? 'Name is required' : null),
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email'),
      password: (v) => (v.length >= 8 ? null : 'Min 8 characters'),
    },
  });

  const handleSubmit = async (values) => {
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(values.name, values.email, values.password);
      } else {
        await login(values.email, values.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center mih="100vh" p="md">
      <Box w={isMobile ? '100%' : 420} mx="auto">
        <Paper withBorder shadow="md" p={isMobile ? 'lg' : 'xl'} radius="md">
          <Stack>
            <div>
              <Title order={isMobile ? 3 : 2} ta="center">Metrik</Title>
              <Text c="dimmed" size="sm" ta="center" mt={4}>
                {isRegister ? 'Create your account' : 'Sign in to continue'}
              </Text>
            </div>

            {error && <Alert color="red" variant="light">{error}</Alert>}

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack>
                {isRegister && (
                  <TextInput
                    label="Name"
                    placeholder="Your name"
                    {...form.getInputProps('name')}
                  />
                )}
                <TextInput
                  label="Email"
                  placeholder="you@example.com"
                  {...form.getInputProps('email')}
                />
                <PasswordInput
                  label="Password"
                  placeholder="Min 8 characters"
                  {...form.getInputProps('password')}
                />
                <Button type="submit" fullWidth loading={loading}>
                  {isRegister ? 'Register' : 'Login'}
                </Button>
              </Stack>
            </form>

            <Text c="dimmed" size="sm" ta="center">
              {isRegister ? 'Already have an account? ' : "Don't have an account? "}
              <Anchor
                component="button"
                type="button"
                size="sm"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
              >
                {isRegister ? 'Login' : 'Register'}
              </Anchor>
            </Text>
          </Stack>
        </Paper>
      </Box>
    </Center>
  );
}
