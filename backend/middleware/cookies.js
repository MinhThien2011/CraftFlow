import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId , res) =>{
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  return accessToken;
}