import React from 'react';
import AnimatedLoader from './AnimatedLoader';

const LoadingWebm: React.FC<{ visible: boolean }> = ({ visible }) => {
  return <AnimatedLoader visible={visible} overlay size="large" />;
};

export default LoadingWebm;
