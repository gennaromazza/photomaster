import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Event } from '@shared/schema';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CategoryData {
  id: number;
  name: string;
  count: number;
  color: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const EventCategoriesChart = () => {
  const [data, setData] = useState<CategoryData[]>([]);

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/service-categories'],
  });

  useEffect(() => {
    if (events.length && categories.length) {
      // Count events by category
      const eventsByCategoryId = events.reduce((acc, event) => {
        if (event.categoryId) {
          acc[event.categoryId] = (acc[event.categoryId] || 0) + 1;
        }
        return acc;
      }, {} as Record<number, number>);

      // Create data for chart
      const chartData = categories
        .map((category, index) => ({
          id: category.id,
          name: category.name,
          count: eventsByCategoryId[category.id] || 0,
          color: COLORS[index % COLORS.length],
        }))
        .filter(item => item.count > 0);

      setData(chartData);
    }
  }, [events, categories]);

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eventi per Categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <p className="text-sm text-gray-500">Nessun evento disponibile</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Eventi per Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} eventi`, name]}
                labelFormatter={() => ''}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Dettaglio Eventi per Categoria:</h4>
          <ul className="space-y-1">
            {data.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="flex items-center">
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: item.color }}
                  ></span>
                  {item.name}
                </span>
                <span className="font-medium">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventCategoriesChart;