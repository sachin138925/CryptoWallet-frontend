// src/components/Card.js
import React from "react";
import clsx from "clsx";

const Card = ({ title, children, className }) => (
  <section className={clsx("card", className)}>
    {title && <h3>{title}</h3>}
    {children}
  </section>
);

export default Card;