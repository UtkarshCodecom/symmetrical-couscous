const isDeadlineMissed = (deadline) => {
    const today = new Date();
    const taskDeadline = new Date(deadline.year, deadline.month - 1, deadline.day);
    return today > taskDeadline;
  };
  