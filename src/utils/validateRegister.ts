import { UsernamePasswordInput } from '../resolvers/UsernamePasswordInput';

export const validateRegister = (options: UsernamePasswordInput) => {
  if (!options.email.includes('@')) {
    return [
      {
        field: 'email',
        message: 'invalid email',
      },
    ];
  }

  if (options.username.length <= 2) {
    return [
      {
        field: 'username',
        message: 'username requires at least 2 characters',
      },
    ];
  }

  if (options.username.includes('@')) {
    return [
      {
        field: 'username',
        message: 'cannot include an @',
      },
    ];
  }

  if (options.password.length < 3) {
    return [
      {
        field: 'password',
        message: 'password requires at least 3 characters',
      },
    ];
  }

  return null;
};
