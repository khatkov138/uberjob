"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Check, Plus, Loader2 } from "lucide-react"
import { updateWorkerProfile } from "./actions"

const ALL_SKILLS = [
  "Электрик", "Сантехник", "Маляр", "Сборка мебели", 
  "Клининг", "ИТ-услуги", "Курьер", "Грузчик", "Ремонт техники"
]

export default function ProProfilePage({ initialData }: { initialData: any }) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialData?.skills || [])

  const mutation = useMutation({
    mutationFn: (skills: string[]) => updateWorkerProfile(skills),
    onSuccess: (res) => {
      if (res.success) toast.success("Навыки сохранены!")
      else toast.error(res.error)
    }
  })

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill) 
        : [...prev, skill]
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-black">Ваша специализация</h1>
        <p className="text-muted-foreground">Выберите навыки, чтобы получать релевантные заказы</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Доступные категории</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ALL_SKILLS.map((skill) => {
              const isSelected = selectedSkills.includes(skill)
              return (
                <Badge
                  key={skill}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer py-2 px-4 text-sm transition-all hover:bg-primary/10 data-[state=active]:bg-primary"
                  onClick={() => toggleSkill(skill)}
                >
                  {isSelected ? <Check className="w-3 h-3 mr-2" /> : <Plus className="w-3 h-3 mr-2" />}
                  {skill}
                </Badge>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Button 
        className="w-full h-12 font-bold text-lg rounded-xl"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(selectedSkills)}
      >
        {mutation.isPending ? <Loader2 className="animate-spin mr-2" /> : "Сохранить и найти работу"}
      </Button>
    </div>
  )
}