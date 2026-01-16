module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: '循環依存は禁止されています',
      severity: 'error',
      from: {},
      to: { circular: true }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    }
  }
};
